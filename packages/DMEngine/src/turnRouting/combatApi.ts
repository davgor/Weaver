import {
  applySurrender,
  attemptFlee,
  executeHelplessCombatant,
  getEncounter,
  resolveAttack,
  resolveNonLethalVictory,
  startAdHocEncounter,
  startEncounter,
  submitCombatAction,
  type AttackResolutionDeps,
  type EncounterStore,
  type ResolutionPeerDeps,
  type StartAdHocEncounterDeps,
  type StartEncounterDeps
} from '@weaver/combat-engine'
import type { CombatTurnApi } from './types.js'

export type StoreCombatTurnApiOptions = {
  attack?: AttackResolutionDeps
  resolution?: ResolutionPeerDeps
  start?: StartEncounterDeps
  adHoc?: StartAdHocEncounterDeps
}

export function createStoreCombatTurnApi(
  store: EncounterStore,
  options: StoreCombatTurnApiOptions = {}
): CombatTurnApi {
  return {
    getEncounter: (encounterId) => getEncounter({ encounterId, store }),
    startEncounter: (input) => startEncounter({ ...input, store }, options.start),
    startAdHocEncounter: (input) => startAdHocEncounter({ ...input, store }, options.adHoc),
    resolveEncounter: (encounterId) => {
      const encounter = getEncounter({ encounterId, store })
      if (encounter === undefined) {
        throw new Error(`Encounter not found: ${encounterId}`)
      }
      return store.saveEncounter({ ...encounter, status: 'resolved' })
    },
    submitCombatAction: (input) => submitCombatAction({ ...input, store }),
    resolveAttack: (input) => resolveAttack({ ...input, store }, options.attack),
    attemptFlee: (input) => attemptFlee({ ...input, store }, options.resolution),
    applySurrender: (input) => applySurrender({ ...input, store }, options.resolution),
    resolveNonLethalVictory: (input) =>
      resolveNonLethalVictory({ ...input, store }, options.resolution),
    executeHelplessCombatant: (input) =>
      executeHelplessCombatant({ ...input, store }, options.resolution)
  }
}
