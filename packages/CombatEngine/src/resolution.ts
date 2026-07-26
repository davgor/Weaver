import { getAbilityModifier } from '@weaver/character-engine'
import { generateLoot as defaultGenerateLoot } from '@weaver/item-engine'
import { setNpcDefeatDisposition as defaultSetDisposition } from '@weaver/npc-engine'
import {
  findCombatant,
  replaceCombatant,
  requireActiveEncounter,
  saveEncounterUpdate,
  withCondition
} from './encounter.js'
import type {
  ApplySurrenderInput,
  ApplySurrenderResult,
  AttemptFleeInput,
  AttemptFleeResult,
  CombatConditionId,
  DefeatDispositionWrite,
  EncounterCombatant,
  EncounterState,
  EvaluateSurrenderInput,
  ExecuteCombatantInput,
  OutcomeResolutionResult,
  ResolutionPeerDeps,
  ResolveNonLethalInput,
  SurrenderEvaluation
} from './types.js'

const DEFAULT_FLEE_DC = 12
const LOW_HP_RATIO = 0.25
const HOPELESS_RATIO = 2
const FLEE_BLOCKERS: readonly CombatConditionId[] = ['restrained', 'stunned']
const EXECUTE_ELIGIBLE: readonly CombatConditionId[] = ['helpless', 'surrendered', 'down']

export function attemptFlee(
  input: AttemptFleeInput,
  deps: ResolutionPeerDeps = {}
): AttemptFleeResult {
  const encounter = requireActiveEncounter(input)
  const combatant = findCombatant(encounter, input.combatantId)
  assertFleeEligible(combatant)
  const dc = input.dc ?? DEFAULT_FLEE_DC
  const modifier = getAbilityModifier(combatant.abilityScores.Agility)
  const roll = assertD20((deps.roller ?? rollD20)())
  const total = roll + modifier
  const success = total >= dc
  const next = success ? applyFleeSuccess(encounter, combatant) : encounter
  const saved = saveEncounterUpdate(input, next)
  if (success) {
    writeDisposition(deps, {
      disposition: 'fled',
      npcId: combatant.id,
      encounterId: input.encounterId,
      actorId: combatant.id
    }, combatant)
  }
  return { success, roll, modifier, total, dc, encounter: saved }
}

export function evaluateSurrender(input: EvaluateSurrenderInput): SurrenderEvaluation {
  const encounter = requireActiveEncounter(input)
  const combatant = findCombatant(encounter, input.combatantId)
  return surrenderCheck(encounter, combatant)
}

export function applySurrender(
  input: ApplySurrenderInput,
  deps: ResolutionPeerDeps = {}
): ApplySurrenderResult {
  const encounter = requireActiveEncounter(input)
  const combatant = findCombatant(encounter, input.combatantId)
  const evaluation = surrenderCheck(encounter, combatant)
  if (!evaluation.eligible) {
    throw new Error(evaluation.reason ?? `${combatant.id} is not eligible to surrender`)
  }
  const marked = withCondition(combatant, 'surrendered')
  const updated = replaceCombatant(encounter, marked)
  const resolved = resolveIfNoActiveHostiles(updated)
  const saved = saveEncounterUpdate(input, resolved)
  writeDisposition(deps, {
    disposition: 'yielded',
    npcId: combatant.id,
    encounterId: input.encounterId,
    actorId: input.actorId ?? combatant.id
  }, combatant)
  return { encounter: saved }
}

export function resolveNonLethalVictory(
  input: ResolveNonLethalInput,
  deps: ResolutionPeerDeps = {}
): OutcomeResolutionResult {
  const encounter = requireActiveEncounter(input)
  const target = findCombatant(encounter, input.targetId)
  assertText(input.actorId, 'actorId')
  assertText(input.lootSeed, 'lootSeed')
  const downed = withCondition(
    {
      ...target,
      hp: { current: 0, max: target.hp?.max ?? target.hp?.current ?? 0 }
    },
    'down'
  )
  const updated = replaceCombatant(encounter, downed)
  const resolved = resolveIfNoActiveHostiles(updated)
  const saved = saveEncounterUpdate(input, resolved)
  writeDisposition(deps, {
    disposition: 'nonLethal',
    npcId: target.id,
    encounterId: input.encounterId,
    actorId: input.actorId
  }, target)
  const loot = rollLoot(deps, input.lootSeed, input.lootDifficulty)
  return { encounter: saved, loot }
}

export function executeHelplessCombatant(
  input: ExecuteCombatantInput,
  deps: ResolutionPeerDeps = {}
): OutcomeResolutionResult {
  const encounter = requireActiveEncounter(input)
  const target = findCombatant(encounter, input.targetId)
  assertText(input.actorId, 'actorId')
  assertText(input.lootSeed, 'lootSeed')
  assertExecutable(target)
  const executed = withCondition(target, 'executed')
  const updated = replaceCombatant(encounter, executed)
  const resolved = resolveIfNoActiveHostiles(updated)
  const saved = saveEncounterUpdate(input, resolved)
  writeDisposition(deps, {
    disposition: 'executed',
    npcId: target.id,
    encounterId: input.encounterId,
    actorId: input.actorId
  }, target)
  const loot = rollLoot(deps, input.lootSeed, input.lootDifficulty)
  return { encounter: saved, loot }
}

function assertFleeEligible(combatant: EncounterCombatant): void {
  const blocker = FLEE_BLOCKERS.find((condition) => combatant.conditions.includes(condition))
  if (blocker !== undefined) {
    throw new Error(`${combatant.id} is not eligible to flee while ${blocker}`)
  }
}

function applyFleeSuccess(
  encounter: EncounterState,
  combatant: EncounterCombatant
): EncounterState {
  const fled = withCondition(combatant, 'fled')
  const withFled = replaceCombatant(encounter, fled)
  const turnOrder = withFled.turnOrder.filter((id) => id !== combatant.id)
  const currentTurnIndex = Math.min(withFled.currentTurnIndex, Math.max(turnOrder.length - 1, 0))
  const currentId = turnOrder[currentTurnIndex] ?? withFled.currentTurn.combatantId
  const next: EncounterState = {
    ...withFled,
    turnOrder,
    currentTurnIndex,
    currentTurn:
      currentId === withFled.currentTurn.combatantId
        ? withFled.currentTurn
        : { combatantId: currentId, actionUsed: false, movementUsed: false }
  }
  return resolveIfNoActiveHostiles(next)
}

function surrenderCheck(
  encounter: EncounterState,
  combatant: EncounterCombatant
): SurrenderEvaluation {
  const hpRatio = hitPointRatio(combatant)
  const allyCount = countActiveSide(encounter, combatant.kind)
  const opposingCount = countOpposing(encounter, combatant.kind)
  const lowHp = hpRatio <= LOW_HP_RATIO
  const hopeless = opposingCount >= allyCount * HOPELESS_RATIO && opposingCount > allyCount
  if (!lowHp) {
    return {
      eligible: false,
      reason: `${combatant.id} is not eligible to surrender while HP remains above 25%`,
      hpRatio,
      opposingCount,
      allyCount
    }
  }
  if (!hopeless) {
    return {
      eligible: false,
      reason: `${combatant.id} is not eligible to surrender without hopeless odds`,
      hpRatio,
      opposingCount,
      allyCount
    }
  }
  return { eligible: true, hpRatio, opposingCount, allyCount }
}

function hitPointRatio(combatant: EncounterCombatant): number {
  const max = combatant.hp?.max
  if (max === undefined || max <= 0) {
    return 1
  }
  return combatant.hp!.current / max
}

function countActiveSide(encounter: EncounterState, kind: EncounterCombatant['kind']): number {
  return encounter.combatants.filter(
    (entry) => sameSide(entry.kind, kind) && isActiveCombatant(entry)
  ).length
}

function countOpposing(encounter: EncounterState, kind: EncounterCombatant['kind']): number {
  return encounter.combatants.filter(
    (entry) => !sameSide(entry.kind, kind) && isActiveCombatant(entry)
  ).length
}

function sameSide(
  left: EncounterCombatant['kind'],
  right: EncounterCombatant['kind']
): boolean {
  return isPlayerSide(left) === isPlayerSide(right)
}

function isPlayerSide(kind: EncounterCombatant['kind']): boolean {
  return kind === 'character'
}

function isActiveCombatant(combatant: EncounterCombatant): boolean {
  return !combatant.conditions.some((condition) =>
    condition === 'fled' ||
    condition === 'surrendered' ||
    condition === 'down' ||
    condition === 'executed'
  )
}

function resolveIfNoActiveHostiles(encounter: EncounterState): EncounterState {
  const hostilesLeft = encounter.combatants.some(
    (entry) => !isPlayerSide(entry.kind) && isActiveCombatant(entry)
  )
  if (hostilesLeft) {
    return encounter
  }
  return { ...encounter, status: 'resolved' }
}

function assertExecutable(target: EncounterCombatant): void {
  const eligible = EXECUTE_ELIGIBLE.some((condition) => target.conditions.includes(condition))
  if (!eligible) {
    throw new Error(
      `${target.id} cannot be executed unless helpless, surrendered, or down`
    )
  }
}

function writeDisposition(
  deps: ResolutionPeerDeps,
  write: DefeatDispositionWrite,
  combatant: EncounterCombatant
): void {
  if (combatant.kind !== 'npc') {
    return
  }
  const writer = deps.setNpcDefeatDisposition ?? defaultSetDisposition
  writer({
    npcId: write.npcId,
    disposition: write.disposition,
    source: { encounterId: write.encounterId, actorId: write.actorId }
  })
}

function rollLoot(
  deps: ResolutionPeerDeps,
  seed: string,
  difficulty: ResolveNonLethalInput['lootDifficulty']
) {
  const generate = deps.generateLoot ?? defaultGenerateLoot
  return generate({
    seed,
    ...(difficulty === undefined ? {} : { difficulty })
  })
}

function assertD20(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new Error(`D20 roller returned invalid roll: ${roll}`)
  }
  return roll
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}
