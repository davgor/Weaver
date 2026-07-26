import { beforeEach, describe, expect, it } from 'vitest'
import { itemEngine } from '../engineApi.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  ITEM_SLICE_VERSION,
  ItemPortabilitySchemaError,
  type ItemCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-item'
const CHARACTER_ID = 'pc-item'

beforeEach(() => {
  itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
})

describe('ItemEngine campaign portability', () => {
  it('round-trips currency balances for campaign characters', () => {
    itemEngine.credit(CHARACTER_ID, 42)

    const ctx = { campaignId: CAMPAIGN_ID, characterIds: [CHARACTER_ID] }
    const slice = exportCampaignSlice(ctx)
    expect(slice.balances).toEqual({ [CHARACTER_ID]: 42 })

    itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
    importCampaignSlice(ctx, slice)
    expect(itemEngine.getBalance(CHARACTER_ID)).toBe(42)
  })
})

describe('ItemEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof ITEM_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(ItemPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported item slice version/)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(ItemPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): {
  ctx: { campaignId: string; characterIds: string[] }
  slice: ItemCampaignSlice
} {
  itemEngine.credit(CHARACTER_ID, 12)
  const ctx = { campaignId: CAMPAIGN_ID, characterIds: [CHARACTER_ID] }
  return { ctx, slice: exportCampaignSlice(ctx) }
}
