export * from './encounter.js'
export * from './hydration.js'
export * from './store.js'
export type * from './types.js'

import {
  endTurn,
  getEncounter,
  startEncounter,
  submitCombatAction,
  submitMovement
} from './encounter.js'
import type {
  EndTurnInput,
  EncounterLookupInput,
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
  getEncounter: typeof getEncounter
  submitCombatAction: typeof submitCombatAction
  submitMovement: typeof submitMovement
  endTurn: typeof endTurn
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/combat-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'encounter.start',
      description: 'Start a durable encounter and roll initiative once',
      invoke: (payload) => startEncounter(readPayload<StartEncounterInput>(payload, 'encounter.start'))
    },
    {
      name: 'encounter.get',
      description: 'Get durable encounter state by id',
      invoke: (payload) => getEncounter(readPayload<EncounterLookupInput>(payload, 'encounter.get'))
    },
    {
      name: 'encounter.action',
      description: 'Submit one typed free-text Action for the current turn',
      invoke: (payload) => submitCombatAction(readPayload<SubmitCombatActionInput>(payload, 'encounter.action'))
    },
    {
      name: 'encounter.movement',
      description: 'Submit one Movement for the current turn',
      invoke: (payload) => submitMovement(readPayload<SubmitMovementInput>(payload, 'encounter.movement'))
    },
    {
      name: 'encounter.endTurn',
      description: 'Advance the active encounter to the next combatant turn',
      invoke: (payload) => endTurn(readPayload<EndTurnInput>(payload, 'encounter.endTurn'))
    },
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
  getEncounter,
  submitCombatAction,
  submitMovement,
  endTurn,
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((e) => e.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}

function readPayload<T>(payload: unknown, endpoint: string): T {
  if (!isRecord(payload)) {
    throw new Error(`${endpoint} payload must be an object`)
  }
  return payload as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
