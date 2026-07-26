import { getBestiaryEntry, hydrateBestiaryEntry, listBestiary } from './bestiary.js'
import { assignQuestFoes, generateEncounterFoes, hydrateCombatantFromFoe } from './generation.js'
import { getGeneratedFoe } from './store.js'
import { requestCombatToken } from './tokenHook.js'
import type {
  BestiaryEntry,
  CombatTokenRequest,
  EngineEndpoint,
  GenerateEncounterFoesInput,
  GeneratedFoeRef,
  QuestFoeAssignmentInput
} from './types.js'

const PACKAGE_NAME = '@weaver/enemy-engine'
const VERSION = '0.1.0'

export function health() {
  return { ok: true as const, package: PACKAGE_NAME, version: VERSION }
}

export function buildEndpoints(): EngineEndpoint[] {
  return [
    endpoint('health', 'Return package health metadata', () => health()),
    endpoint('listBestiary', 'List seeded bestiary entries', () => listBestiary()),
    endpoint('getBestiaryEntry', 'Read one bestiary entry', getBestiaryEndpoint),
    endpoint('hydrateBestiaryEntry', 'Hydrate bestiary HP from shared CharacterEngine rules', hydrateBestiaryEndpoint),
    endpoint('generateEncounterFoes', 'Generate scoped encounter foe references', generationEndpoint),
    endpoint('assignQuestFoes', 'Validate and assign quest foe references', questEndpoint),
    endpoint('hydrateCombatantFromFoe', 'Hydrate a foe reference for CombatEngine', combatantEndpoint),
    endpoint('getGeneratedFoe', 'Read one generated foe reference', generatedFoeEndpoint),
    endpoint('requestCombatToken', 'Queue a non-blocking combat token image request', tokenEndpoint)
  ]
}

function endpoint(name: string, description: string, invoke: EngineEndpoint['invoke']): EngineEndpoint {
  return { name, description, invoke }
}

function getBestiaryEndpoint(payload: unknown) {
  return getBestiaryEntry(readString(asRecord(payload, 'getBestiaryEntry'), 'bestiaryId'))
}

function hydrateBestiaryEndpoint(payload: unknown) {
  return hydrateBestiaryEntry(asPayload<BestiaryEntry>(payload, 'hydrateBestiaryEntry'))
}

function generationEndpoint(payload: unknown) {
  return generateEncounterFoes(asOptionalPayload<GenerateEncounterFoesInput>(payload))
}

function questEndpoint(payload: unknown) {
  return assignQuestFoes(asPayload<QuestFoeAssignmentInput>(payload, 'assignQuestFoes'))
}

function combatantEndpoint(payload: unknown) {
  return hydrateCombatantFromFoe(asPayload<GeneratedFoeRef>(payload, 'hydrateCombatantFromFoe'))
}

function generatedFoeEndpoint(payload: unknown) {
  return getGeneratedFoe(readString(asRecord(payload, 'getGeneratedFoe'), 'foeId'))
}

function tokenEndpoint(payload: unknown) {
  return requestCombatToken(asPayload<CombatTokenRequest>(payload, 'requestCombatToken'))
}

function asOptionalPayload<T>(payload: unknown): T {
  if (payload === undefined) {
    return {} as T
  }
  asRecord(payload, 'payload')
  return payload as T
}

function asPayload<T>(payload: unknown, label: string): T {
  asRecord(payload, label)
  return payload as T
}

function asRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`${label} requires an object payload`)
  }
  return payload as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected ${key} to be a non-empty string`)
  }
  return value
}
