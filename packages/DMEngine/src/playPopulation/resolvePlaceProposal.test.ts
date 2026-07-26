import { beforeEach, describe, expect, it } from 'vitest'
import { clearPlaceProposalRegistry, resolvePlaceProposal } from './resolvePlaceProposal.js'
import type { LivePopulationDeps, PlaceProposal } from './types.js'

describe('resolvePlaceProposal', () => {
  beforeEach(() => clearPlaceProposalRegistry())

  it('mints a place through peer APIs once for an idempotency key', () => {
    const counters = { regions: 0, settlements: 0, npcs: 0, lootSeeds: 0 }
    const deps = fakeDeps(counters)
    const proposal: PlaceProposal = {
      proposalKey: 'roadside-inn',
      worldId: 'world-live',
      campaignId: 'campaign-live',
      dataRoot: '/tmp/weaver-live',
      npcsToMint: 1,
      lootSeed: 'roadside-inn-loot'
    }

    const first = resolvePlaceProposal(proposal, deps)
    const second = resolvePlaceProposal(proposal, deps)

    expect(second).toEqual(first)
    expect(counters).toEqual({ regions: 1, settlements: 1, npcs: 1, lootSeeds: 1 })
    expect(first).toMatchObject({
      proposalKey: 'roadside-inn',
      regionId: 'region-live',
      civilizationId: 'civ-live',
      npcIds: ['roadside-inn.npc.1'],
      lootPlaceId: 'civ-live'
    })
  })
})

function fakeDeps(counters: { regions: number; settlements: number; npcs: number; lootSeeds: number }): LivePopulationDeps {
  return {
    world: {
      getWorldMeta: () => ({
        worldId: 'world-live',
        seed: 1,
        bounds: bounds(),
        noise: noise(),
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        cellCount: 1
      }),
      getWorldBounds: () => bounds(),
      getExpansion: () => null,
      getCell: () => null,
      getWorldSpecific: () => []
    },
    regional: {
      fillRegions: () => {
        counters.regions += 1
        return [region()]
      },
      listRegions: () => [region()],
      getRegion: () => region(),
      getRegionSummary: () => region(),
      getRegionCells: () => [],
      getRegionsInBounds: () => [region()]
    },
    civilization: {
      fillCivilizations: () => {
        counters.settlements += 1
        return [civilization()]
      },
      listCivilizationsInRegion: () => [civilization()],
      ensureNpcPlaceholders: () => [slot()]
    },
    npc: {
      constructNpc: (input) => {
        counters.npcs += 1
        return { npcId: input.npcId }
      }
    },
    item: {
      generateLoot: () => [{ templateId: 'template.healing_potion', quantity: 1 }],
      seedPlaceLoot: (placeId, drops) => {
        counters.lootSeeds += 1
        return { placeId, drops }
      }
    }
  }
}

function bounds() {
  return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
}

function noise() {
  return { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 }
}

function region() {
  return {
    regionId: 'region-live',
    worldId: 'world-live',
    dominantLandType: 'forest',
    landTypeHistogram: { forest: 1 },
    averageElevation: 0,
    minElevation: 0,
    maxElevation: 0,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 1,
    bounds: bounds(),
    centroid: { x: 0, y: 0 },
    statsVersion: 1,
    extraStats: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function civilization() {
  return {
    civilizationId: 'civ-live',
    worldId: 'world-live',
    regionId: 'region-live',
    kind: 'village',
    origin: { x: 0, y: 0 },
    bounds: bounds(),
    seedSalt: 1,
    population: 10,
    npcSlotCount: 1,
    npcSlotsAssigned: 0,
    statsVersion: 1,
    extraStats: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function slot() {
  return {
    slotId: 'slot-live',
    civilizationId: 'civ-live',
    worldId: 'world-live',
    regionId: 'region-live',
    roleHint: 'resident',
    status: 'unassigned'
  }
}
