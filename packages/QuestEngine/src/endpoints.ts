import { QuestEngineError } from './errors.js'
import { seedWorldQuests } from './seed.js'
import {
  clearWorldQuestsForCampaign,
  defineQuestTemplate,
  deleteWorldQuest,
  getWorldQuest,
  listWorldQuests
} from './store.js'
import type { EngineEndpoint } from './typesApi.js'
import type {
  DefineQuestTemplateInput,
  QuestObjective,
  QuestReferenceLookup,
  SeedWorldQuestsInput
} from './types.js'

const PACKAGE_NAME = '@weaver/quest-engine'
const VERSION = '0.1.0'

export function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'seedWorldQuests',
      description: 'Deterministically seed world quests from peer id pools',
      invoke: (payload) => seedWorldQuests(parseSeedPayload(payload))
    },
    {
      name: 'listWorldQuests',
      description: 'List seeded world quests, optionally by campaignId',
      invoke: (payload) => listWorldQuests(readOptionalCampaignId(payload))
    },
    {
      name: 'getWorldQuest',
      description: 'Get one world quest by questId',
      invoke: (payload) => requireQuest(readString(readRecord(payload, 'getWorldQuest'), 'questId'))
    },
    {
      name: 'defineQuestTemplate',
      description: 'Register a reusable quest template shape',
      invoke: (payload) => defineQuestTemplate(parseTemplatePayload(payload))
    },
    {
      name: 'clearWorldQuestsForCampaign',
      description: 'Remove all seeded world quests for a campaign',
      invoke: (payload) =>
        clearWorldQuestsForCampaign(readString(readRecord(payload, 'clearWorldQuestsForCampaign'), 'campaignId'))
    },
    {
      name: 'deleteWorldQuest',
      description: 'Delete one world quest by questId',
      invoke: (payload) =>
        deleteWorldQuest(readString(readRecord(payload, 'deleteWorldQuest'), 'questId'))
    }
  ]
}

function requireQuest(questId: string) {
  const quest = getWorldQuest(questId)
  if (quest === undefined) {
    throw new QuestEngineError('QUEST_NOT_FOUND', `Unknown questId: ${questId}`)
  }
  return quest
}

function parseSeedPayload(payload: unknown): SeedWorldQuestsInput {
  const record = readRecord(payload, 'seedWorldQuests')
  const pools = readRecord(record['pools'], 'pools')
  const lookup = readOptionalLookup(record['lookup'])
  const counts = readOptionalCounts(record['counts'])
  return {
    campaignId: readString(record, 'campaignId'),
    worldId: readString(record, 'worldId'),
    seed: readString(record, 'seed'),
    pools: {
      regionIds: readStringArray(pools['regionIds'], 'regionIds'),
      placeIds: readStringArray(pools['placeIds'], 'placeIds'),
      npcIds: readStringArray(pools['npcIds'], 'npcIds'),
      itemIds: readStringArray(pools['itemIds'], 'itemIds'),
      ...(pools['dungeonIds'] === undefined
        ? {}
        : { dungeonIds: readStringArray(pools['dungeonIds'], 'dungeonIds') })
    },
    ...(counts === undefined ? {} : { counts }),
    ...(lookup === undefined ? {} : { lookup })
  }
}

function parseTemplatePayload(payload: unknown): DefineQuestTemplateInput {
  const record = readRecord(payload, 'defineQuestTemplate')
  const lookup = readOptionalLookup(record['lookup'])
  const kind = record['kind']
  if (kind !== 'main' && kind !== 'side') {
    throw new Error('Expected kind to be main or side')
  }
  const title = readOptionalString(record, 'title')
  const brief = readOptionalString(record, 'brief')
  return {
    templateId: readString(record, 'templateId'),
    kind,
    objectives: readObjectives(record['objectives']),
    ...(title === undefined ? {} : { title }),
    ...(brief === undefined ? {} : { brief }),
    ...(lookup === undefined ? {} : { lookup })
  }
}

function readObjectives(value: unknown): QuestObjective[] {
  return readArray(value, 'objectives').map((entry, index) => readObjective(entry, index))
}

function readObjective(entry: unknown, index: number): QuestObjective {
  const record = readRecord(entry, `objectives[${index}]`)
  const kind = record['kind']
  if (
    kind !== 'talk_to_npc' &&
    kind !== 'reach_place' &&
    kind !== 'obtain_item'
  ) {
    throw new Error(`Expected objectives[${index}].kind to be a known objective kind`)
  }
  const summary = readOptionalString(record, 'summary')
  return {
    objectiveId: readString(record, 'objectiveId'),
    kind,
    targetId: readString(record, 'targetId'),
    ...(summary === undefined ? {} : { summary })
  }
}

function readOptionalLookup(value: unknown): QuestReferenceLookup | undefined {
  if (value === undefined) {
    return undefined
  }
  const record = readRecord(value, 'lookup')
  const npcIds = new Set(readStringArray(record['npcIds'], 'lookup.npcIds'))
  const placeIds = new Set(readStringArray(record['placeIds'], 'lookup.placeIds'))
  const itemIds = new Set(readStringArray(record['itemIds'], 'lookup.itemIds'))
  return {
    hasNpc: (npcId) => npcIds.has(npcId),
    hasPlace: (placeId) => placeIds.has(placeId),
    hasItem: (itemId) => itemIds.has(itemId)
  }
}

function readOptionalCounts(value: unknown): { main?: number; side?: number } | undefined {
  if (value === undefined) {
    return undefined
  }
  const record = readRecord(value, 'counts')
  return {
    ...(record['main'] === undefined ? {} : { main: readNumber(record, 'main') }),
    ...(record['side'] === undefined ? {} : { side: readNumber(record, 'side') })
  }
}

function readOptionalCampaignId(payload: unknown): string | undefined {
  if (payload === undefined) {
    return undefined
  }
  return readOptionalString(readRecord(payload, 'listWorldQuests'), 'campaignId')
}

function readRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`Expected ${label} payload to be an object`)
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

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw new Error(`Expected ${key} to be a string`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${key} to be a number`)
  }
  return value
}

function readArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${label} to be an array`)
  }
  return value
}

function readStringArray(value: unknown, label: string): string[] {
  return readArray(value, label).map((entry) => {
    if (typeof entry !== 'string') {
      throw new Error(`Expected ${label} to contain strings`)
    }
    return entry
  })
}
