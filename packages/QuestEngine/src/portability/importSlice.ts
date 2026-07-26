import { clearWorldQuestsForCampaign, restoreWorldQuests } from '../store.js'
import {
  QUEST_SLICE_VERSION,
  QuestPortabilitySchemaError,
  type QuestCampaignSlice,
  type QuestPortabilityContext
} from './types.js'

export function importCampaignSlice(
  ctx: QuestPortabilityContext,
  slice: QuestCampaignSlice
): void {
  if (slice.sliceVersion !== QUEST_SLICE_VERSION) {
    throw new QuestPortabilitySchemaError(
      `Unsupported quest slice version ${String(slice.sliceVersion)}; expected ${QUEST_SLICE_VERSION}`
    )
  }
  if (slice.campaignId !== ctx.campaignId) {
    throw new QuestPortabilitySchemaError(
      `Quest slice campaignId mismatch: expected ${ctx.campaignId}, found ${slice.campaignId}`
    )
  }
  for (const quest of slice.worldQuests) {
    if (quest.campaignId !== ctx.campaignId) {
      throw new QuestPortabilitySchemaError(
        `Quest ${quest.questId} belongs to campaign ${quest.campaignId}, expected ${ctx.campaignId}`
      )
    }
  }
  clearWorldQuestsForCampaign(ctx.campaignId)
  restoreWorldQuests(slice.worldQuests)
}
