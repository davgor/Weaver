import type { ItemCampaignState } from '../itemService.js'

export const ITEM_SLICE_VERSION = 2

export type ItemPortabilityContext = {
  campaignId: string
  characterIds: readonly string[]
}

export type ItemCampaignSlice = ItemCampaignState & {
  sliceVersion: typeof ITEM_SLICE_VERSION
  campaignId: string
  balances: Record<string, number>
}

export class ItemPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ItemPortabilitySchemaError'
  }
}
