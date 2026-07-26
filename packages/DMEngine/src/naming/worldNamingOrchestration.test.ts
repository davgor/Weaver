import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService } from '@weaver/civilization-engine'
import {
  realizePlaceNaming,
  realizePantheon,
  sealPlaceNaming,
  type TextCompleter
} from '@weaver/narration-engine'
import {
  realizeCampaignPantheon,
  realizeRegionName,
  realizeSettlementName,
  regenerateRegionName,
  assertValidatedPlaceNaming
} from './worldNamingOrchestration.js'
import { DmNamingError } from './errors.js'
import type { Aabb, WorldMeta } from '@weaver/world-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-dm-naming-'))
  roots.push(root)
  return root
}

function makeWorld() {
  const bounds: Aabb = { minX: 0, minY: 0, maxX: 3, maxY: 2 }
  return {
    getWorldMeta: (worldId: string): WorldMeta => ({
      worldId,
      seed: 1,
      bounds,
      noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cellCount: 12
    }),
    getWorldBounds: () => bounds,
    getExpansion: () => null,
    getCell: () => null,
    getWorldSpecific: () => []
  }
}

function narrationApi() {
  return { realizePlaceNaming, realizePantheon, sealPlaceNaming }
}

function scriptedCompleter(responses: string[]): TextCompleter {
  let index = 0
  return {
    async completeText() {
      const text = responses[index] ?? responses[responses.length - 1] ?? '{}'
      index += 1
      return { text, backend: 'test' }
    }
  }
}

function sampleRegion(regionId: string) {
  return {
    regionId,
    worldId: 'w1',
    dominantLandType: 'grassland' as const,
    landTypeHistogram: { grassland: 2 },
    averageElevation: 0.3,
    minElevation: 0.2,
    maxElevation: 0.4,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 2,
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 0 },
    centroid: { x: 0.5, y: 0 },
    statsVersion: 1,
    extraStats: {},
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]
  }
}

describe('worldNamingOrchestration realize', () => {
  it('realizes region naming through narration then persists on RegionalEngine', async () => {
    const dataRoot = tempRoot()
    const regionalService = createRegionalService({ dataRoot, world: makeWorld() })
    const region = regionalService.createRegion('w1', sampleRegion('region_dm'))
    const completer = scriptedCompleter([
      JSON.stringify({ displayName: 'Harbor Vale', history: 'A busy port on the coast.' }),
      JSON.stringify({ displayName: 'Greenfold', history: 'Quiet grasslands between old hills.' })
    ])

    const updated = await realizeRegionName(
      narrationApi(),
      { service: regionalService, worldId: 'w1' },
      completer,
      { campaignId: 'camp-dm', regionId: region.regionId }
    )

    expect(updated.displayName).toBe('Greenfold')
    expect(updated.namingRealizedAt).toBeTruthy()
    expect(regionalService.getRegion('w1', region.regionId)?.displayName).toBe('Greenfold')
  })

  it('regenerates region naming without changing stats', async () => {
    const dataRoot = tempRoot()
    const regionalService = createRegionalService({ dataRoot, world: makeWorld() })
    const region = regionalService.createRegion(
      'w1',
      { ...sampleRegion('region_regen'), dominantLandType: 'forest', landTypeHistogram: { forest: 2 } }
    )
    const regional = { service: regionalService, worldId: 'w1' }
    const input = { campaignId: 'camp-dm', regionId: region.regionId }

    await realizeRegionName(
      narrationApi(),
      regional,
      scriptedCompleter([JSON.stringify({ displayName: 'Oldwood', history: 'Ancient trees.' })]),
      input
    )

    const regenerated = await regenerateRegionName(
      narrationApi(),
      regional,
      scriptedCompleter([JSON.stringify({ displayName: 'Newwood', history: 'Freshly named forest.' })]),
      { ...input, seed: 'reroll-1' }
    )

    expect(regenerated.displayName).toBe('Newwood')
    expect(regenerated.cellCount).toBe(2)
  })
})

describe('worldNamingOrchestration validation gate', () => {
  it('rejects DM-invented naming that bypasses narration validation', () => {
    const dmInvented = {
      campaignId: 'camp-dm',
      displayName: 'DM Invented',
      history: 'Made up in DMEngine.',
      seal: 'not-a-real-seal'
    } as never

    expect(() => assertValidatedPlaceNaming(dmInvented)).toThrow(DmNamingError)
  })
})

describe('settlement orchestration', () => {
  it('realizes settlement naming via narration', async () => {
    const dataRoot = tempRoot()
    const regionalService = createRegionalService({ dataRoot, world: makeWorld() })
    regionalService.createRegion('w1', {
      ...sampleRegion('region_settle'),
      cellCount: 1,
      cells: [{ x: 0, y: 0 }],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      centroid: { x: 0, y: 0 }
    })
    const civilizationService = createCivilizationService({
      dataRoot,
      regional: regionalService,
      world: makeWorld()
    })
    const settlement = civilizationService.createCivilization('w1', {
      civilizationId: 'civ_dm',
      worldId: 'w1',
      regionId: 'region_settle',
      kind: 'hamlet',
      origin: { x: 0, y: 0 },
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      seedSalt: 1,
      population: 80,
      overlays: [{ x: 0, y: 0, landUse: 'building' }],
      npcSlots: [{ roleHint: 'resident' }],
      statsVersion: 1,
      extraStats: {}
    })

    const named = await realizeSettlementName(
      {
        narration: narrationApi(),
        civilization: { service: civilizationService, worldId: 'w1' },
        regional: { service: regionalService, worldId: 'w1' },
        completer: scriptedCompleter([
          JSON.stringify({ displayName: 'Millbrook', history: 'A quiet farming hamlet.' })
        ])
      },
      { campaignId: 'camp-dm', civilizationId: settlement.civilizationId }
    )

    expect(named.displayName).toBe('Millbrook')
  })
})

describe('pantheon orchestration', () => {
  it('realizes campaign pantheon via narration', async () => {
    const pantheon = await realizeCampaignPantheon(
      narrationApi(),
      scriptedCompleter([
        JSON.stringify({
          deities: [
            { name: 'Ari the Bright', domain: 'dawn and hope' },
            { name: 'Bran the Steadfast', domain: 'stone and oaths' }
          ]
        })
      ]),
      { campaignId: 'camp-dm', count: 2 }
    )

    expect(pantheon.deities).toHaveLength(2)
  })
})
