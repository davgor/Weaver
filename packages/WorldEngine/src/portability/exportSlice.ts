import { createWorldService } from '../store/worldService.js'
import {
  WORLD_SLICE_VERSION,
  type WorldCampaignSlice,
  type WorldPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: WorldPortabilityContext): WorldCampaignSlice {
  const service = createWorldService(ctx.dataRoot)
  if (!service.hasWorld(ctx.worldId)) {
    throw new Error(`World not found for campaign export: ${ctx.worldId}`)
  }
  return {
    sliceVersion: WORLD_SLICE_VERSION,
    campaignId: ctx.campaignId,
    worldId: ctx.worldId,
    meta: service.getWorldMeta(ctx.worldId)
  }
}
