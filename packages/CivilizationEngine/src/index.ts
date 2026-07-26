import {
  claimNpcPlaceholder,
  ensureNpcPlaceholders,
  listNpcPlaceholders,
  listUnassignedNpcPlaceholders,
  releaseNpcPlaceholder,
  type ListUnassignedFilter,
  type NpcRoleHint
} from './npcPlaceholders.js'

export {
  NPC_ROLE_HINTS,
  claimNpcPlaceholder,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders,
  listNpcPlaceholders,
  listUnassignedNpcPlaceholders,
  releaseNpcPlaceholder
} from './npcPlaceholders.js'
export type {
  EnsureNpcPlaceholdersInput,
  ListUnassignedFilter,
  NpcPlaceholderSlot,
  NpcPlaceholderStatus,
  NpcRoleHint
} from './npcPlaceholders.js'

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type CivilizationEngineApi = {
  id: 'CivilizationEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/civilization-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    healthEndpoint(),
    {
      name: 'ensureNpcPlaceholders',
      description: 'Create unassigned NPC placeholder slots for a civilization',
      invoke: (payload) => ensureFromPayload(payload)
    },
    {
      name: 'listNpcPlaceholders',
      description: 'List NPC placeholder slots for a civilization',
      invoke: (payload) => listFromPayload(payload)
    },
    {
      name: 'listUnassignedNpcPlaceholders',
      description: 'List unassigned NPC placeholder slots',
      invoke: (payload) => listUnassignedFromPayload(payload)
    },
    {
      name: 'claimNpcPlaceholder',
      description: 'Assign an NPC id to a placeholder slot',
      invoke: (payload) => claimFromPayload(payload)
    },
    {
      name: 'releaseNpcPlaceholder',
      description: 'Clear assignment from a placeholder slot',
      invoke: (payload) => releaseFromPayload(payload)
    }
  ]
}

function healthEndpoint(): EngineEndpoint {
  return {
    name: 'health',
    description: 'Return package health metadata',
    invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
  }
}

export const civilizationEngine: CivilizationEngineApi = {
  id: 'CivilizationEngine',
  title: 'Civilization Engine',
  description:
    'Deterministic settlement placement, population tracking, and NPC placeholders for regions',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
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

function ensureFromPayload(payload: unknown) {
  const record = asRecord(payload, 'ensureNpcPlaceholders')
  return ensureNpcPlaceholders({
    worldId: readString(record, 'worldId'),
    civilizationId: readString(record, 'civilizationId'),
    regionId: readString(record, 'regionId'),
    roleHints: readRoleHints(record)
  })
}

function listFromPayload(payload: unknown) {
  const record = asRecord(payload, 'listNpcPlaceholders')
  return listNpcPlaceholders(readString(record, 'worldId'), readString(record, 'civilizationId'))
}

function listUnassignedFromPayload(payload: unknown) {
  const record = asRecord(payload, 'listUnassignedNpcPlaceholders')
  return listUnassignedNpcPlaceholders(readString(record, 'worldId'), readFilter(record))
}

function claimFromPayload(payload: unknown) {
  const record = asRecord(payload, 'claimNpcPlaceholder')
  return claimNpcPlaceholder(
    readString(record, 'worldId'),
    readString(record, 'slotId'),
    readString(record, 'npcId')
  )
}

function releaseFromPayload(payload: unknown) {
  const record = asRecord(payload, 'releaseNpcPlaceholder')
  return releaseNpcPlaceholder(readString(record, 'worldId'), readString(record, 'slotId'))
}

function readFilter(record: Record<string, unknown>): ListUnassignedFilter {
  const filter: ListUnassignedFilter = {}
  const regionId = optionalString(record, 'regionId')
  const civilizationId = optionalString(record, 'civilizationId')
  const roleHint = optionalString(record, 'roleHint')
  if (regionId !== undefined) filter.regionId = regionId
  if (civilizationId !== undefined) filter.civilizationId = civilizationId
  if (roleHint !== undefined) filter.roleHint = roleHint as NpcRoleHint
  return filter
}

function readRoleHints(record: Record<string, unknown>): NpcRoleHint[] {
  const value = record.roleHints
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error('Expected roleHints to be a string array')
  }
  return value as NpcRoleHint[]
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

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`)
  }
  return value
}
