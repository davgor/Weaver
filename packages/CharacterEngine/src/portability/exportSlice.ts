import { listCompanionsForCampaign } from '../companions.js'
import { getCampaignDeathMode } from '../deathModes.js'
import { getCampaignDay } from '../timeRest.js'
import {
  CHARACTER_SLICE_VERSION,
  type CharacterCampaignSlice,
  type CharacterPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: CharacterPortabilityContext): CharacterCampaignSlice {
  const companions = listCompanionsForCampaign(ctx.campaignId)
  const characterIds = [...new Set(companions.map((record) => record.characterId))].sort()
  const deathMode = getCampaignDeathMode(ctx.campaignId)
  return {
    sliceVersion: CHARACTER_SLICE_VERSION,
    campaignId: ctx.campaignId,
    day: getCampaignDay(ctx.campaignId),
    ...(deathMode === undefined ? {} : { deathMode }),
    characterIds,
    companions
  }
}
