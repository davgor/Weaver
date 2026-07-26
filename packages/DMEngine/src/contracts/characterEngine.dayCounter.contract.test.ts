import { describe, expect, it } from 'vitest'
import { advanceTravelDays, getCampaignDay, longRest } from '@weaver/character-engine'
import { getSharedCampaignDay } from '../sharedTime/index.js'

describe('DMEngine -> CharacterEngine day-counter contract (031)', () => {
  it('reads the shared campaign day through CharacterEngine getCampaignDay', () => {
    const campaignId = 'campaign-dm-day-counter-contract'
    const api = { getCampaignDay }

    expect(getSharedCampaignDay(campaignId, api)).toBe(getCampaignDay(campaignId))
  })

  it('reflects travel and long-rest advances from CharacterEngine', () => {
    const campaignId = 'campaign-dm-day-counter-mutations'
    const api = { getCampaignDay }

    expect(getSharedCampaignDay(campaignId, api)).toBe(0)

    longRest(campaignId)
    expect(getSharedCampaignDay(campaignId, api)).toBe(1)

    advanceTravelDays(campaignId, 2)
    expect(getSharedCampaignDay(campaignId, api)).toBe(3)
  })
})
