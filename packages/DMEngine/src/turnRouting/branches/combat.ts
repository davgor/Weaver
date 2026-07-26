import type { EncounterState } from '@weaver/combat-engine'
import {
  TurnRoutingError,
  type BranchResolution,
  type CombatBranchInput,
  type CombatIntent,
  type CombatOutcome
} from '../types.js'

export function resolveCombatBranch(input: CombatBranchInput): BranchResolution {
  const encounterId = requireEncounterId(input.encounterId)
  assertActiveEncounter(input, encounterId)
  if (input.combatIntent === undefined) {
    return resolveTyped(input, encounterId)
  }
  return dispatchIntent(input, encounterId, input.combatIntent)
}

function assertActiveEncounter(input: CombatBranchInput, encounterId: string): void {
  const encounter = input.combat.getEncounter(encounterId)
  if (encounter === undefined || encounter.status !== 'active') {
    throw new TurnRoutingError(
      'DM_TURN_COMBAT_INACTIVE',
      `Combat route requires an active encounter: ${encounterId}`
    )
  }
}

function dispatchIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: CombatIntent
): BranchResolution {
  if (intent.kind === 'attack') return resolveAttackIntent(input, encounterId, intent)
  if (intent.kind === 'flee') return resolveFleeIntent(input, encounterId, intent)
  if (intent.kind === 'surrender') return resolveSurrenderIntent(input, encounterId)
  if (intent.kind === 'nonLethal') return resolveNonLethalIntent(input, encounterId, intent)
  if (intent.kind === 'execute') return resolveExecuteIntent(input, encounterId, intent)
  return resolveActionIntent(input, encounterId, intent)
}

function resolveTyped(input: CombatBranchInput, encounterId: string): BranchResolution {
  const actionText = input.combatAction?.trim() || 'Take combat action'
  const updated = input.combat.submitCombatAction({
    encounterId,
    combatantId: input.combatantId,
    action: { type: 'typed-action', action: actionText }
  })
  return combatResult(updated, { type: 'typed', action: actionText })
}

function resolveAttackIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: Extract<CombatIntent, { kind: 'attack' }>
): BranchResolution {
  const resolved = input.combat.resolveAttack({
    encounterId,
    attackerId: input.combatantId,
    targetId: intent.targetId,
    weaponInstanceId: intent.weaponInstanceId,
    attackAbility: intent.attackAbility,
    proficient: intent.proficient ?? true,
    proficiencyBonus: intent.proficiencyBonus ?? 0
  })
  const target = resolved.encounter.combatants.find((c) => c.id === intent.targetId)
  return combatResult(resolved.encounter, {
    type: 'attack',
    hit: resolved.attack.hit,
    totalDamage: resolved.totalDamage,
    critical: resolved.attack.critical,
    targetId: intent.targetId,
    targetHp: target?.hp ?? null,
    conditions: [...(target?.conditions ?? [])]
  })
}

function resolveFleeIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: Extract<CombatIntent, { kind: 'flee' }>
): BranchResolution {
  const fled = input.combat.attemptFlee({
    encounterId,
    combatantId: input.combatantId,
    ...(intent.dc === undefined ? {} : { dc: intent.dc })
  })
  return combatResult(fled.encounter, {
    type: 'flee',
    success: fled.success,
    roll: fled.roll,
    total: fled.total,
    dc: fled.dc
  })
}

function resolveSurrenderIntent(input: CombatBranchInput, encounterId: string): BranchResolution {
  const yielded = input.combat.applySurrender({
    encounterId,
    combatantId: input.combatantId
  })
  return combatResult(yielded.encounter, { type: 'surrender' })
}

function resolveNonLethalIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: Extract<CombatIntent, { kind: 'nonLethal' }>
): BranchResolution {
  const resolved = input.combat.resolveNonLethalVictory({
    encounterId,
    actorId: input.combatantId,
    targetId: intent.targetId,
    lootSeed: intent.lootSeed
  })
  return combatResult(resolved.encounter, {
    type: 'nonLethal',
    targetId: intent.targetId,
    loot: resolved.loot
  })
}

function resolveExecuteIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: Extract<CombatIntent, { kind: 'execute' }>
): BranchResolution {
  const resolved = input.combat.executeHelplessCombatant({
    encounterId,
    actorId: input.combatantId,
    targetId: intent.targetId,
    lootSeed: intent.lootSeed
  })
  return combatResult(resolved.encounter, {
    type: 'execute',
    targetId: intent.targetId,
    loot: resolved.loot
  })
}

function resolveActionIntent(
  input: CombatBranchInput,
  encounterId: string,
  intent: Extract<CombatIntent, { kind: 'action' }>
): BranchResolution {
  const actions = requireActions(input)
  const used = actions.useAction({
    characterId: input.combatantId,
    actionId: intent.actionId,
    targetIds: intent.targetIds,
    distanceFeet: intent.distanceFeet,
    ...(intent.weaponReachFeet === undefined ? {} : { weaponReachFeet: intent.weaponReachFeet })
  })
  if (!used.ok) {
    throw new TurnRoutingError('DM_TURN_ROUTE_INVALID', used.reason)
  }
  const updated = input.combat.submitCombatAction({
    encounterId,
    combatantId: input.combatantId,
    action: { type: 'typed-action', action: `action:${intent.actionId}` }
  })
  return combatResult(updated, {
    type: 'action',
    actionId: used.actionId,
    appliedEffects: used.appliedEffects,
    lockout: used.lockout
  })
}

function requireActions(input: CombatBranchInput): NonNullable<CombatBranchInput['actions']> {
  if (input.actions === undefined) {
    throw new TurnRoutingError(
      'DM_TURN_ROUTE_INVALID',
      'Action combat intents require an ActionEngine actions dependency'
    )
  }
  return input.actions
}

function requireEncounterId(encounterId: string | undefined): string {
  if (encounterId === undefined || encounterId.trim().length === 0) {
    throw new TurnRoutingError('DM_TURN_COMBAT_INACTIVE', 'encounterId is required for combat turns')
  }
  return encounterId
}

function combatResult(encounter: EncounterState, outcome: CombatOutcome): BranchResolution {
  return { kind: 'combat', encounter, outcome }
}
