import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPlaceInventories,
  generateLoot,
  listPlaceInventory,
  seedPlaceLoot
} from '@weaver/item-engine'
import { resolvePlaceProposal } from '../resolvePlaceProposal.js'
import {
  bootLiveWorld,
  cleanupLivePopulationRoots,
  realLivePopulationDeps
} from './fixture.js'

afterEach(() => {
  cleanupLivePopulationRoots()
  clearPlaceInventories()
})

describe('DMEngine -> ItemEngine live population contract', () => {
  it('seeds generated loot into the minted place through ItemEngine public API', () => {
    const campaignId = 'campaign-item-mint-contract'
    const { dataRoot, worldId } = bootLiveWorld(campaignId)

    const resolved = resolvePlaceProposal({
      proposalKey: 'item-mint',
      worldId,
      campaignId,
      dataRoot,
      lootSeed: 'item-mint-loot'
    }, {
      ...realLivePopulationDeps(),
      item: { generateLoot, seedPlaceLoot }
    })

    expect(listPlaceInventory(resolved.lootPlaceId ?? '').drops.length).toBeGreaterThan(0)
  })
})
