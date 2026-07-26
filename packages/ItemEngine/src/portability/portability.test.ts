import { beforeEach, describe, expect, it } from 'vitest'
import { itemEngine } from '../engineApi.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

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
