import { beforeEach, describe, expect, it } from 'vitest'
import {
  advanceTravelDays,
  clearCharacterLocationStore,
  getCharacterLocation,
  setCharacterLocation
} from '@weaver/character-engine'
import { DmIntentError } from '../intents/errors.js'
import { resolveTravelIntent } from '../intents/travelHandler.js'
import type { TravelDestinationLookup } from '../intents/types.js'

const travelApi = { advanceTravelDays, setCharacterLocation }

describe('DMEngine -> CharacterEngine travel location contract (101)', () => {
  beforeEach(() => {
    clearCharacterLocationStore()
  })

  it('mutates placement through the published setCharacterLocation API after travel', () => {
    const characterId = 'pc-dm-travel-loc'
    const campaignId = 'campaign-dm-travel-loc'
    const result = resolveTravelIntent(travelApi, dungeonDestinations(), {
      characterId,
      campaignId,
      destinationId: 'place.contract-dungeon',
      proposedDays: 4
    })

    expect(getCharacterLocation(characterId)).toEqual({
      characterId,
      campaignId,
      regionId: 'opaque-region-contract',
      placeId: 'opaque-place-contract',
      locationKind: 'dungeon',
      updatedDay: result.advance.day
    })
  })

  it('leaves CharacterEngine location unchanged when travel is rejected', () => {
    const characterId = 'pc-dm-travel-loc-reject'
    const prior = setCharacterLocation({
      characterId,
      campaignId: 'campaign-dm-travel-loc-reject',
      regionId: 'opaque-region-prior',
      locationKind: 'overworld'
    })

    expect(() =>
      resolveTravelIntent(travelApi, rejectedDestinations(), {
        characterId,
        campaignId: 'campaign-dm-travel-loc-reject',
        destinationId: 'place.ungenerated',
        proposedDays: 2
      })
    ).toThrow(DmIntentError)

    expect(getCharacterLocation(characterId)).toEqual(prior)
  })
})

function dungeonDestinations(): TravelDestinationLookup {
  return {
    isGenerated: () => true,
    resolvePlacement: () => ({
      regionId: 'opaque-region-contract',
      placeId: 'opaque-place-contract',
      locationKind: 'dungeon'
    })
  }
}

function rejectedDestinations(): TravelDestinationLookup {
  return {
    isGenerated: () => false,
    resolvePlacement: () => ({
      regionId: 'opaque-region-rejected',
      locationKind: 'settlement'
    })
  }
}
