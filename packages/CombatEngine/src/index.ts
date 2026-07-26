export {
  resolveAttack,
  resolveAttackAgainstCombatants
} from './attackResolution.js'
export { startAdHocEncounter } from './dynamicStart.js'
export {
  endTurn,
  getEncounter,
  startEncounter,
  submitCombatAction,
  submitMovement
} from './encounter.js'
export {
  hydrateCombatantFromEnemySnapshot,
  hydrateCombatantFromFoeRef,
  hydrateCombatantFromNpcId,
  hydrateCombatantFromNpcRecord
} from './hydration.js'
export {
  applySurrender,
  attemptFlee,
  evaluateSurrender,
  executeHelplessCombatant,
  resolveNonLethalVictory
} from './resolution.js'
export {
  cloneEncounter,
  createJsonEncounterStore,
  createMemoryEncounterStore
} from './store.js'
export type * from './types.js'

import { resolveAttack } from './attackResolution.js'
import { startAdHocEncounter } from './dynamicStart.js'
import {
  endTurn,
  getEncounter,
  startEncounter,
  submitCombatAction,
  submitMovement
} from './encounter.js'
import {
  applySurrender,
  attemptFlee,
  evaluateSurrender,
  executeHelplessCombatant,
  resolveNonLethalVictory
} from './resolution.js'
import type {
  ApplySurrenderInput,
  AttemptFleeInput,
  EndTurnInput,
  EncounterLookupInput,
  EvaluateSurrenderInput,
  ExecuteCombatantInput,
  ResolveAttackInput,
  ResolveNonLethalInput,
  StartAdHocEncounterInput,
  StartEncounterInput,
  SubmitCombatActionInput,
  SubmitMovementInput
} from './types.js'

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type CombatEngineApi = {
  id: 'CombatEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  startEncounter: typeof startEncounter
  startAdHocEncounter: typeof startAdHocEncounter
  getEncounter: typeof getEncounter
  submitCombatAction: typeof submitCombatAction
  submitMovement: typeof submitMovement
  endTurn: typeof endTurn
  resolveAttack: typeof resolveAttack
  attemptFlee: typeof attemptFlee
  evaluateSurrender: typeof evaluateSurrender
  applySurrender: typeof applySurrender
  resolveNonLethalVictory: typeof resolveNonLethalVictory
  executeHelplessCombatant: typeof executeHelplessCombatant
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/combat-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    ...lifecycleEndpoints(),
    ...resolutionEndpoints()
  ]
}

function lifecycleEndpoints(): EngineEndpoint[] {
  return [
    endpoint('health', 'Return package health metadata', () => ({
      ok: true as const,
      package: PACKAGE_NAME,
      version: VERSION
    })),
    endpoint('encounter.start', 'Start a pre-authored durable encounter and roll initiative once', (payload) =>
      startEncounter(readPayload<StartEncounterInput>(payload, 'encounter.start'))
    ),
    endpoint(
      'encounter.startAdHoc',
      'Start an ambush/ad-hoc encounter, generating foes via EnemyEngine',
      (payload) =>
        startAdHocEncounter(readPayload<StartAdHocEncounterInput>(payload, 'encounter.startAdHoc'))
    ),
    endpoint('encounter.get', 'Get durable encounter state by id', (payload) =>
      getEncounter(readPayload<EncounterLookupInput>(payload, 'encounter.get'))
    ),
    endpoint('encounter.action', 'Submit one typed free-text Action for the current turn', (payload) =>
      submitCombatAction(readPayload<SubmitCombatActionInput>(payload, 'encounter.action'))
    ),
    endpoint('encounter.attack', 'Resolve a weapon attack against a target combatant', (payload) =>
      resolveAttack(readPayload<ResolveAttackInput>(payload, 'encounter.attack'))
    ),
    endpoint('encounter.movement', 'Submit one Movement for the current turn', (payload) =>
      submitMovement(readPayload<SubmitMovementInput>(payload, 'encounter.movement'))
    ),
    endpoint('encounter.endTurn', 'Advance the active encounter to the next combatant turn', (payload) =>
      endTurn(readPayload<EndTurnInput>(payload, 'encounter.endTurn'))
    )
  ]
}

function resolutionEndpoints(): EngineEndpoint[] {
  return [
    endpoint('encounter.flee', 'Attempt to flee the active encounter', (payload) =>
      attemptFlee(readPayload<AttemptFleeInput>(payload, 'encounter.flee'))
    ),
    endpoint('encounter.evaluateSurrender', 'Evaluate whether a combatant may surrender', (payload) =>
      evaluateSurrender(readPayload<EvaluateSurrenderInput>(payload, 'encounter.evaluateSurrender'))
    ),
    endpoint('encounter.surrender', 'Apply a surrender outcome when eligible', (payload) =>
      applySurrender(readPayload<ApplySurrenderInput>(payload, 'encounter.surrender'))
    ),
    endpoint(
      'encounter.nonLethal',
      'Resolve a non-lethal victory leaving the target down at 0 HP',
      (payload) =>
        resolveNonLethalVictory(readPayload<ResolveNonLethalInput>(payload, 'encounter.nonLethal'))
    ),
    endpoint(
      'encounter.execute',
      'Deliberately execute a helpless, surrendered, or down combatant',
      (payload) =>
        executeHelplessCombatant(readPayload<ExecuteCombatantInput>(payload, 'encounter.execute'))
    )
  ]
}

export const combatEngine: CombatEngineApi = {
  id: 'CombatEngine',
  title: 'Combat Engine',
  description: 'Deterministic combat rules and resolution',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  startEncounter,
  startAdHocEncounter,
  getEncounter,
  submitCombatAction,
  submitMovement,
  endTurn,
  resolveAttack,
  attemptFlee,
  evaluateSurrender,
  applySurrender,
  resolveNonLethalVictory,
  executeHelplessCombatant,
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpointName: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpointName)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpointName}`)
    }
    return await match.invoke(payload)
  }
}

function endpoint(
  name: string,
  description: string,
  invoke: (payload?: unknown) => Promise<unknown> | unknown
): EngineEndpoint {
  return { name, description, invoke }
}

function readPayload<T>(payload: unknown, endpointName: string): T {
  if (!isRecord(payload)) {
    throw new Error(`${endpointName} payload must be an object`)
  }
  return payload as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
