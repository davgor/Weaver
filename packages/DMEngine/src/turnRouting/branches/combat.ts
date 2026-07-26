import { TurnRoutingError, type BranchResolution, type CombatBranchInput } from '../types.js'

export function resolveCombatBranch(input: CombatBranchInput): BranchResolution {
  const encounterId = requireEncounterId(input.encounterId)
  const encounter = input.combat.getEncounter(encounterId)
  if (encounter === undefined || encounter.status !== 'active') {
    throw new TurnRoutingError(
      'DM_TURN_COMBAT_INACTIVE',
      `Combat route requires an active encounter: ${encounterId}`
    )
  }
  const actionText = input.combatAction?.trim() || 'Take combat action'
  const updated = input.combat.submitCombatAction({
    encounterId,
    combatantId: input.combatantId,
    action: { type: 'typed-action', action: actionText }
  })
  return { kind: 'combat', encounter: updated }
}

function requireEncounterId(encounterId: string | undefined): string {
  if (encounterId === undefined || encounterId.trim().length === 0) {
    throw new TurnRoutingError('DM_TURN_COMBAT_INACTIVE', 'encounterId is required for combat turns')
  }
  return encounterId
}
