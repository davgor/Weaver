import type { DifficultyBand } from '@weaver/character-engine'
import type {
  CombatConditionId,
  EncounterCombatant,
  EncounterState
} from '@weaver/combat-engine'
import { resolveCombatBranch } from '../turnRouting/branches/combat.js'
import type {
  CombatBranchInput,
  CombatBranchResolution,
  CombatOutcome
} from '../turnRouting/types.js'
import type {
  CharacterProgressionApi,
  CombatLevelUpSummary,
  CombatRewards,
  EncounterIdContext,
  EncounterIdFactory,
  EncounterRewardRequest,
  EncounterStartRequest
} from './types.js'

const INACTIVE_CONDITIONS: readonly CombatConditionId[] = [
  'fled',
  'surrendered',
  'down',
  'executed'
]

let encounterSequence = 0

export type StartEncounterForTurnInput = {
  combat: CombatBranchInput['combat']
  context: EncounterIdContext
  encounterStart: EncounterStartRequest
  createEncounterId?: EncounterIdFactory
}

export type ResolveEncounterLoopInput = {
  branch: CombatBranchInput
  context: EncounterIdContext
  encounterStart?: EncounterStartRequest
  rewards?: EncounterRewardRequest
  progression?: CharacterProgressionApi
  createEncounterId?: EncounterIdFactory
}

export type FinalizeCombatResolutionInput = {
  resolution: CombatBranchResolution
  combat: Pick<CombatBranchInput['combat'], 'resolveEncounter'>
  characterId: string
  rewards?: EncounterRewardRequest
  progression?: CharacterProgressionApi
}

export function resolveEncounterLoop(input: ResolveEncounterLoopInput): CombatBranchResolution {
  const encounterId = resolveEncounterId(input)
  const branch = encounterId === undefined ? input.branch : { ...input.branch, encounterId }
  const resolution = requireCombatResolution(resolveCombatBranch(branch))
  return finalizeCombatResolution({
    resolution,
    combat: input.branch.combat,
    characterId: input.context.characterId,
    rewards: input.rewards ?? defaultRewards(input.encounterStart),
    ...(input.progression === undefined ? {} : { progression: input.progression })
  })
}

function requireCombatResolution(resolution: { kind: string }): CombatBranchResolution {
  if (resolution.kind !== 'combat') {
    throw new Error(`Encounter loop expected combat resolution, got ${resolution.kind}`)
  }
  return resolution as CombatBranchResolution
}

export function startEncounterForTurn(input: StartEncounterForTurnInput): EncounterState {
  const encounterId = input.encounterStart.encounterId ?? createEncounterId(input)
  if (input.encounterStart.mode === 'adHoc') {
    return input.combat.startAdHocEncounter({
      encounterId,
      knownCombatants: input.encounterStart.knownCombatants ?? [],
      ...(input.encounterStart.foeGeneration === undefined
        ? {}
        : { foeGeneration: input.encounterStart.foeGeneration })
    })
  }
  return input.combat.startEncounter({
    encounterId,
    combatants: input.encounterStart.combatants
  })
}

export function finalizeCombatResolution(
  input: FinalizeCombatResolutionInput
): CombatBranchResolution {
  const resolution = closeTerminalEncounter(input.resolution, input.combat)
  const rewards = buildRewards(input, resolution)
  return rewards === undefined ? resolution : { ...resolution, rewards }
}

function resolveEncounterId(input: ResolveEncounterLoopInput): string | undefined {
  const active = readActiveEncounter(input.branch.combat, input.branch.encounterId)
  if (active !== undefined) {
    return active.encounterId
  }
  if (input.encounterStart === undefined) {
    return input.branch.encounterId
  }
  return startEncounterForTurn({
    combat: input.branch.combat,
    context: input.context,
    encounterStart: input.encounterStart,
    ...(input.createEncounterId === undefined ? {} : { createEncounterId: input.createEncounterId })
  }).encounterId
}

function readActiveEncounter(
  combat: CombatBranchInput['combat'],
  encounterId: string | undefined
): EncounterState | undefined {
  if (encounterId === undefined) {
    return undefined
  }
  const encounter = combat.getEncounter(encounterId)
  return encounter?.status === 'active' ? encounter : undefined
}

function closeTerminalEncounter(
  resolution: CombatBranchResolution,
  combat: Pick<CombatBranchInput['combat'], 'resolveEncounter'>
): CombatBranchResolution {
  if (resolution.encounter.status === 'resolved' || !shouldClose(resolution.encounter)) {
    return resolution
  }
  return { ...resolution, encounter: combat.resolveEncounter(resolution.encounter.encounterId) }
}

function shouldClose(encounter: EncounterState): boolean {
  return !hasActiveSide(encounter, 'character') || !hasActiveHostiles(encounter)
}

function hasActiveHostiles(encounter: EncounterState): boolean {
  return encounter.combatants.some((combatant) =>
    combatant.kind !== 'character' && isActiveCombatant(combatant)
  )
}

function hasActiveSide(encounter: EncounterState, kind: EncounterCombatant['kind']): boolean {
  return encounter.combatants.some((combatant) =>
    combatant.kind === kind && isActiveCombatant(combatant)
  )
}

function isActiveCombatant(combatant: EncounterCombatant): boolean {
  return !combatant.conditions.some((condition) => INACTIVE_CONDITIONS.includes(condition))
}

function buildRewards(
  input: FinalizeCombatResolutionInput,
  resolution: CombatBranchResolution
): CombatRewards | undefined {
  if (!isVictory(resolution.encounter)) {
    return undefined
  }
  const loot = extractLoot(resolution.outcome)
  const xp = input.progression?.awardXp(input.characterId, input.rewards?.xpDifficulty ?? 'easy')
  if (xp === undefined && loot.length === 0) {
    return undefined
  }
  const base: CombatRewards = xp === undefined ? { loot } : { xp, loot }
  const levelUp = xp === undefined ? undefined : buildLevelUp(xp)
  return levelUp === undefined ? base : { ...base, levelUp }
}

function isVictory(encounter: EncounterState): boolean {
  return encounter.status === 'resolved' &&
    hasActiveSide(encounter, 'character') &&
    !hasActiveHostiles(encounter)
}

function extractLoot(outcome: CombatOutcome): CombatRewards['loot'] {
  if (outcome.type === 'execute' || outcome.type === 'nonLethal') {
    return outcome.loot
  }
  return []
}

function buildLevelUp(xp: NonNullable<CombatRewards['xp']>): CombatLevelUpSummary | undefined {
  if (xp.levelsGained <= 0) {
    return undefined
  }
  return {
    fromLevel: xp.level - xp.levelsGained,
    toLevel: xp.level,
    levelsGained: xp.levelsGained,
    xp: xp.xp,
    xpAwarded: xp.xpAwarded
  }
}

function defaultRewards(start?: EncounterStartRequest): EncounterRewardRequest {
  return { xpDifficulty: startDifficulty(start) }
}

function startDifficulty(start?: EncounterStartRequest): DifficultyBand {
  const difficulty = start?.mode === 'adHoc' ? start.foeGeneration?.difficulty : undefined
  return difficulty === undefined ? 'easy' : difficulty
}

function createEncounterId(input: StartEncounterForTurnInput): string {
  if (input.createEncounterId !== undefined) {
    return input.createEncounterId(input.context)
  }
  encounterSequence += 1
  return `enc.${slug(input.context.campaignId)}.${slug(input.context.characterId)}.${encounterSequence}`
}

function slug(value: string): string {
  const slugged = value
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-|-$/g, '')
  return slugged.length === 0 ? 'turn' : slugged
}
