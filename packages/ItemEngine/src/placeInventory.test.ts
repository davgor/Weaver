import { beforeEach, describe, expect, it } from 'vitest'
import { clearPlaceInventories, generateLoot, listPlaceInventory, seedPlaceLoot } from './index.js'

describe('place inventory', () => {
  beforeEach(() => clearPlaceInventories())

  it('seeds deterministic loot drops for a place without duplicating repeat seeds', () => {
    const drops = generateLoot({ seed: 'ashford-cellar', difficulty: 'easy' })

    const seeded = seedPlaceLoot('place.ashford-cellar', drops)
    const repeated = seedPlaceLoot('place.ashford-cellar', drops)

    expect(seeded).toEqual({ placeId: 'place.ashford-cellar', drops })
    expect(repeated).toEqual(seeded)
    expect(listPlaceInventory('place.ashford-cellar').drops).toEqual(drops)
  })
})
