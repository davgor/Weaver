import { createRegionStore } from '../store/regionStore.js'
import {
  REGIONAL_SLICE_VERSION,
  RegionalPortabilitySchemaError,
  type RegionalCampaignSlice,
  type RegionalPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: RegionalPortabilityContext, slice: RegionalCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertWorldMatch(ctx.worldId, slice.worldId)

  const store = createRegionStore(ctx.dataRoot)
  store.clearRegions(ctx.worldId)
  for (const entry of slice.regions) {
    store.saveRegion(entry.record, entry.cells)
  }
}

function assertSliceVersion(slice: RegionalCampaignSlice): void {
  if (slice.sliceVersion !== REGIONAL_SLICE_VERSION) {
    throw new RegionalPortabilitySchemaError(
      `Unsupported regional slice version ${String(slice.sliceVersion)}; expected ${REGIONAL_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new RegionalPortabilitySchemaError(
      `Regional slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}

function assertWorldMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new RegionalPortabilitySchemaError(
      `Regional slice worldId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
