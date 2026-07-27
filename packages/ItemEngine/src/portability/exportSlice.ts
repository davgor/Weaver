import { itemEngine } from '../engineApi.js'
import { ITEM_SLICE_VERSION, type ItemCampaignSlice, type ItemPortabilityContext } from './types.js'

export function exportCampaignSlice(ctx: ItemPortabilityContext): ItemCampaignSlice {
  return {
    sliceVersion: ITEM_SLICE_VERSION,
    campaignId: ctx.campaignId,
    balances: itemEngine.snapshotCampaignBalances(ctx.characterIds),
    ...itemEngine.snapshotCampaignItems(ctx.characterIds)
  }
}
