import type { CombatTurnApi } from './types.js'

/** Fill resolution methods with hard failures for tests that only exercise typed combat/logging. */
export function withCombatResolutionStubs(
  partial: Pick<CombatTurnApi, 'getEncounter' | 'submitCombatAction'>
): CombatTurnApi {
  return {
    getEncounter: partial.getEncounter,
    startEncounter: () => fail('startEncounter'),
    startAdHocEncounter: () => fail('startAdHocEncounter'),
    resolveEncounter: () => fail('resolveEncounter'),
    submitCombatAction: partial.submitCombatAction,
    resolveAttack: () => fail('resolveAttack'),
    attemptFlee: () => fail('attemptFlee'),
    applySurrender: () => fail('applySurrender'),
    resolveNonLethalVictory: () => fail('resolveNonLethalVictory'),
    executeHelplessCombatant: () => fail('executeHelplessCombatant')
  }
}

function fail(name: string): never {
  throw new Error(`${name} should not run`)
}
