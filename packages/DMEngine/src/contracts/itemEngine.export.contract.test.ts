import { beforeEach, describe, expect, it } from 'vitest'
import {
  exportItemCampaignSlice,
  importItemCampaignSlice,
  itemEngine
} from '@weaver/item-engine'

const CAMPAIGN_ID = 'contract-item'
const CHARACTER_ID = 'pc-contract'

beforeEach(() => {
  itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
})

describe('DMEngine -> ItemEngine export contract', () => {
  it('reads currency balances through the published export API', () => {
    itemEngine.credit(CHARACTER_ID, 27)

    const slice = exportItemCampaignSlice({
      campaignId: CAMPAIGN_ID,
      characterIds: [CHARACTER_ID]
    })
    expect(slice.balances).toEqual({ [CHARACTER_ID]: 27 })

    itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
    importItemCampaignSlice({ campaignId: CAMPAIGN_ID, characterIds: [CHARACTER_ID] }, slice)
    expect(itemEngine.getBalance(CHARACTER_ID)).toBe(27)
  })
})
