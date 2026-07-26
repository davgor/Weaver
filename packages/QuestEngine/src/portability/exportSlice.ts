import { listWorldQuests } from '../store.js'
import {
  QUEST_SLICE_VERSION,
  type QuestCampaignSlice,
  type QuestPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: QuestPortabilityContext): QuestCampaignSlice {
  return {
    sliceVersion: QUEST_SLICE_VERSION,
    campaignId: ctx.campaignId,
    worldQuests: listWorldQuests(ctx.campaignId)
  }
}
