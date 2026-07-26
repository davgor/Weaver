import { beforeEach, describe, expect, it } from 'vitest'
import {
  characterEngine,
  clearCharacterLocationStore,
  getCharacterLocation,
  setCampaignDay,
  setCharacterLocation
} from '../index.js'

/**
 * Pins location ownership through published helpers + endpoints.
 *
 * DMEngine travel (`resolveTravelIntent`) still advances days only; intended
 * follow-up is to call `setCharacterLocation` after a successful destination
 * check. This epic does not invent that DM orchestration.
 */
describe('CharacterEngine location ownership contract', () => {
  beforeEach(() => {
    clearCharacterLocationStore()
    setCampaignDay('campaign-location-contract', 3)
  })

  it('stores opaque region/place ids without peer geography lookups', async () => {
    const placed = setCharacterLocation({
      characterId: 'pc-contract-loc',
      campaignId: 'campaign-location-contract',
      regionId: 'opaque-region-id',
      placeId: 'opaque-place-id',
      locationKind: 'dungeon'
    })
    expect(placed.updatedDay).toBe(3)
    expect(getCharacterLocation('pc-contract-loc')).toEqual(placed)

    const viaEndpoint = await characterEngine.call('getCharacterLocation', {
      characterId: 'pc-contract-loc'
    })
    expect(viaEndpoint).toEqual(placed)

    await characterEngine.call('clearCharacterLocation', {
      characterId: 'pc-contract-loc'
    })
    expect(getCharacterLocation('pc-contract-loc')).toBeNull()
  })
})
