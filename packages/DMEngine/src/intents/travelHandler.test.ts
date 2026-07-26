import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceTravelDays,
  clearCharacterLocationStore,
  clampTravelDays,
  getCharacterLocation,
  setCharacterLocation
} from '@weaver/character-engine'
import { DmIntentError } from './errors.js'
import { resolveTravelIntent } from './travelHandler.js'
import type {
  CharacterTravelApi,
  TravelDestinationLookup,
  TravelDestinationPlacement,
  TravelIntentRequest
} from './types.js'

describe('travelHandler day advance', () => {
  beforeEach(() => {
    clearCharacterLocationStore()
  })

  it('advances the day counter through CharacterEngine with clamped DM duration', () => {
    const campaignId = 'campaign-travel-ok'
    const result = resolveTravelIntent(realTravelApi(), alwaysGenerated(), {
      characterId: 'pc-travel-ok',
      campaignId,
      destinationId: 'place.riverford',
      proposedDays: 90
    })

    expect(result.kind).toBe('travel')
    expect(result.advance.advancedDays).toBe(clampTravelDays(90))
    expect(result.advance.day).toBe(clampTravelDays(90))
  })

  it('rejects ungenerated destinations without live population', () => {
    expectRejectedTravel({
      characterId: 'pc-travel-fail',
      campaignId: 'campaign-travel-fail',
      destinationId: 'place.missing',
      proposedDays: 3
    })
  })

  it('mints an ungenerated destination through an optional live population hook', () => {
    const minted: string[] = []
    const destinations = mintingDestinations(minted)
    const result = resolveTravelIntent(realTravelApi(), destinations, {
      characterId: 'pc-travel-mint',
      campaignId: 'campaign-travel-mint',
      destinationId: 'place.new-bridge',
      proposedDays: 2
    })

    expect(minted).toEqual(['place.new-bridge'])
    expect(result.destinationId).toBe('place.new-bridge')
    expect(result.advance.advancedDays).toBe(2)
    expect(getCharacterLocation('pc-travel-mint')?.regionId).toBe('opaque-region-bridge')
  })
})

describe('travelHandler location', () => {
  beforeEach(() => {
    clearCharacterLocationStore()
  })

  it('sets traveler location from destination placement after successful advance', () => {
    const characterId = 'pc-travel-place'
    const campaignId = 'campaign-travel-place'
    const placement: TravelDestinationPlacement = {
      regionId: 'opaque-region-river',
      placeId: 'opaque-place-riverford',
      locationKind: 'settlement'
    }

    const result = resolveTravelIntent(realTravelApi(), alwaysGenerated(placement), {
      characterId,
      campaignId,
      destinationId: 'place.riverford',
      proposedDays: 3
    })

    expect(getCharacterLocation(characterId)).toEqual({
      characterId,
      campaignId,
      regionId: placement.regionId,
      placeId: placement.placeId,
      locationKind: placement.locationKind,
      updatedDay: result.advance.day
    })
  })

  it('does not mutate location when destination checks reject travel', () => {
    const characterId = 'pc-travel-reject-loc'
    const prior = setCharacterLocation({
      characterId,
      campaignId: 'campaign-travel-reject-loc',
      regionId: 'opaque-region-home',
      locationKind: 'overworld'
    })

    expectRejectedTravel({
      characterId,
      campaignId: 'campaign-travel-reject-loc',
      destinationId: 'place.missing',
      proposedDays: 3
    })

    expect(getCharacterLocation(characterId)).toEqual(prior)
  })
})

function realTravelApi(): CharacterTravelApi {
  return { advanceTravelDays, setCharacterLocation }
}

function alwaysGenerated(placement?: TravelDestinationPlacement): TravelDestinationLookup {
  return {
    isGenerated: () => true,
    resolvePlacement: () =>
      placement ?? {
        regionId: 'opaque-region-default',
        placeId: 'opaque-place-default',
        locationKind: 'settlement'
      }
  }
}

function mintingDestinations(minted: string[]): TravelDestinationLookup {
  return {
    isGenerated: (destinationId) => minted.includes(destinationId),
    ensureGenerated: (destinationId) => {
      minted.push(destinationId)
    },
    resolvePlacement: () => ({
      regionId: 'opaque-region-bridge',
      placeId: 'place.new-bridge',
      locationKind: 'settlement'
    })
  }
}

function expectRejectedTravel(request: TravelIntentRequest): void {
  const destinations: TravelDestinationLookup = {
    isGenerated: () => false,
    resolvePlacement: () => ({
      regionId: 'opaque-region-should-not-apply',
      locationKind: 'dungeon'
    })
  }

  expect(() => resolveTravelIntent(realTravelApi(), destinations, request)).toThrow(DmIntentError)

  try {
    resolveTravelIntent(realTravelApi(), destinations, request)
  } catch (error) {
    expect(error).toBeInstanceOf(DmIntentError)
    expect((error as DmIntentError).code).toBe('DM_TRAVEL_REJECTED')
    expect((error as Error).message).toMatch(new RegExp(request.destinationId.replace('.', '\\.')))
  }
}
