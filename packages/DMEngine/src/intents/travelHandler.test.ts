import { describe, expect, it } from 'vitest'
import { advanceTravelDays, clampTravelDays } from '@weaver/character-engine'
import { DmIntentError } from './errors.js'
import { resolveTravelIntent } from './travelHandler.js'
import type { CharacterTravelApi, TravelDestinationLookup } from './types.js'

describe('travelHandler', () => {
  it('advances the day counter through CharacterEngine with clamped DM duration', () => {
    const campaignId = 'campaign-travel-ok'
    const result = resolveTravelIntent(
      { advanceTravelDays },
      alwaysGenerated(),
      {
        campaignId,
        destinationId: 'place.riverford',
        proposedDays: 90
      }
    )

    expect(result.kind).toBe('travel')
    expect(result.advance.advancedDays).toBe(clampTravelDays(90))
    expect(result.advance.day).toBe(clampTravelDays(90))
  })

  it('rejects ungenerated destinations without live population', () => {
    const travel: CharacterTravelApi = { advanceTravelDays }
    const destinations: TravelDestinationLookup = {
      isGenerated: () => false
    }

    expect(() =>
      resolveTravelIntent(travel, destinations, {
        campaignId: 'campaign-travel-fail',
        destinationId: 'place.missing',
        proposedDays: 3
      })
    ).toThrow(DmIntentError)

    try {
      resolveTravelIntent(travel, destinations, {
        campaignId: 'campaign-travel-fail',
        destinationId: 'place.missing',
        proposedDays: 3
      })
    } catch (error) {
      expect(error).toBeInstanceOf(DmIntentError)
      expect((error as DmIntentError).code).toBe('DM_TRAVEL_REJECTED')
      expect((error as Error).message).toMatch(/place\.missing/)
    }
  })
})

function alwaysGenerated(): TravelDestinationLookup {
  return { isGenerated: () => true }
}
