import { describe, expect, it } from 'vitest'
import {
  advanceTravelDays,
  clampTravelDays,
  getCampaignDay,
  setCharacterLocation
} from '@weaver/character-engine'
import { resolveTravelIntent } from '../intents/travelHandler.js'

describe('DMEngine -> CharacterEngine travel-time contract (031)', () => {
  it('advances campaign day through the published advanceTravelDays API', () => {
    const campaignId = 'campaign-dm-travel-contract'
    const before = getCampaignDay(campaignId)

    const result = resolveTravelIntent(
      { advanceTravelDays, setCharacterLocation },
      {
        isGenerated: () => true,
        resolvePlacement: () => ({
          regionId: 'opaque-region-riverford',
          placeId: 'place.contract-riverford',
          locationKind: 'settlement'
        })
      },
      {
        characterId: 'pc-dm-travel-contract',
        campaignId,
        destinationId: 'place.contract-riverford',
        proposedDays: 99
      }
    )

    expect(result.advance.advancedDays).toBe(clampTravelDays(99))
    expect(result.advance.day).toBe(before + clampTravelDays(99))
    expect(getCampaignDay(campaignId)).toBe(before + clampTravelDays(99))
  })
})
