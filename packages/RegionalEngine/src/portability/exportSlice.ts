import { createRegionStore } from '../store/regionStore.js'
import {
  REGIONAL_SLICE_VERSION,
  type RegionalCampaignSlice,
  type RegionalPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: RegionalPortabilityContext): RegionalCampaignSlice {
  const store = createRegionStore(ctx.dataRoot)
  const regions = store.listRegions(ctx.worldId).map((record) => ({
    record,
    cells: store.getRegionCells(ctx.worldId, record.regionId)
  }))
  return {
    sliceVersion: REGIONAL_SLICE_VERSION,
    campaignId: ctx.campaignId,
    worldId: ctx.worldId,
    regions
  }
}
