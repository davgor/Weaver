import type { EncounterCombatant, EncounterState } from '@weaver/combat-engine'
import type { CombatChromeCombatant, CombatChromeSnapshot } from '../../shared/play/types.js'

export function buildCombatChrome(encounter: EncounterState | undefined): CombatChromeSnapshot {
  if (encounter === undefined || encounter.status !== 'active') {
    return { active: false }
  }
  return {
    active: true,
    encounterId: encounter.encounterId,
    round: encounter.round,
    activeCombatantId: encounter.currentTurn.combatantId,
    turnOrder: encounter.turnOrder.map((combatantId) => turnOrderEntry(encounter, combatantId))
  }
}

function turnOrderEntry(encounter: EncounterState, combatantId: string): CombatChromeCombatant {
  const combatant = requireCombatant(encounter.combatants, combatantId)
  return {
    combatantId,
    displayName: combatant.displayName ?? combatant.id,
    isActive: combatantId === encounter.currentTurn.combatantId,
    hp: combatant.hp ?? null,
    conditions: [...combatant.conditions]
  }
}

function requireCombatant(
  combatants: readonly EncounterCombatant[],
  combatantId: string
): EncounterCombatant {
  const combatant = combatants.find((entry) => entry.id === combatantId)
  if (combatant === undefined) {
    throw new Error(`Encounter turn order references unknown combatant ${combatantId}`)
  }
  return combatant
}
