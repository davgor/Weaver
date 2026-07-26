import { buildEndpoints } from './endpoints.js'
import { seedWorldQuests } from './seed.js'
import {
  clearWorldQuestsForCampaign,
  defineQuestTemplate,
  deleteWorldQuest,
  getWorldQuest,
  listWorldQuests
} from './store.js'
import type {
  DefineQuestTemplateInput,
  SeedWorldQuestsInput,
  WorldQuest
} from './types.js'

export type QuestEngineApi = {
  id: 'QuestEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  seedWorldQuests: (input: SeedWorldQuestsInput) => WorldQuest[]
  listWorldQuests: (campaignId?: string) => WorldQuest[]
  getWorldQuest: (questId: string) => WorldQuest | undefined
  defineQuestTemplate: (input: DefineQuestTemplateInput) => ReturnType<typeof defineQuestTemplate>
  deleteWorldQuest: (questId: string) => boolean
  clearWorldQuestsForCampaign: (campaignId: string) => number
}

const PACKAGE_NAME = '@weaver/quest-engine'
const VERSION = '0.1.0'

export const questEngine: QuestEngineApi = {
  id: 'QuestEngine',
  title: 'Quest Engine',
  description: 'Deterministic world quest definitions and seeded campaign instances',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  seedWorldQuests,
  listWorldQuests,
  getWorldQuest,
  defineQuestTemplate,
  deleteWorldQuest,
  clearWorldQuestsForCampaign
}
