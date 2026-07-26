import type { WorldQuest } from '../types.js'

export const QUEST_SLICE_VERSION = 1

export type QuestPortabilityContext = {
  campaignId: string
}

export type QuestCampaignSlice = {
  sliceVersion: typeof QUEST_SLICE_VERSION
  campaignId: string
  worldQuests: WorldQuest[]
}

export class QuestPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuestPortabilitySchemaError'
  }
}
