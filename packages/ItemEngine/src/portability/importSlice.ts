import { itemEngine } from '../engineApi.js'
import {
  ITEM_SLICE_VERSION,
  ItemPortabilitySchemaError,
  type ItemCampaignSlice,
  type ItemPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: ItemPortabilityContext, slice: ItemCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  // Preserve instance ids via seed restore; clear then restore replaces prior campaign item state.
  itemEngine.restoreCampaignItems(slice)
  itemEngine.restoreCampaignBalances(slice.balances)
}

function assertSliceVersion(slice: ItemCampaignSlice): void {
  if (slice.sliceVersion !== ITEM_SLICE_VERSION) {
    throw new ItemPortabilitySchemaError(
      `Unsupported item slice version ${String(slice.sliceVersion)}; expected ${ITEM_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new ItemPortabilitySchemaError(
      `Item slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
