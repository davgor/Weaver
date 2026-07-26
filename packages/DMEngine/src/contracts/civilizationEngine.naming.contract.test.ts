import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionalService } from '@weaver/regional-engine'
import { createCivilizationService, realizeSettlementNaming } from '@weaver/civilization-engine'
import {
  persistValidatedSettlementNaming,
  toValidatedPlaceNaming,
  type ValidatedPlaceNaming
} from '../naming/worldNamingOrchestration.js'
import { realizePlaceNaming, sealPlaceNaming } from '@weaver/narration-engine'
import { DmNamingError } from '../naming/errors.js'
import type { Aabb, Cell, ExpansionRecord, WorldMeta } from '@weaver/world-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> CivilizationEngine naming contract persist (060)', () => {
  it('persists narration-validated settlement naming on the real CivilizationEngine API', async () => {
    const dataRoot = tempRoot()
    const { regional, civilization, settlement } = bootstrapWorld(dataRoot)

    const outcome = await realizePlaceNaming(
      {
        kind: 'settlement',
        campaignId: 'contract-camp',
        stats: {
          settlementKind: settlement.kind,
          population: settlement.population,
          regionIsLandlocked: true,
          regionTouchesOcean: false
        }
      },
      scriptedCompleter([
        JSON.stringify({ displayName: 'Millbrook', history: 'Farmers trade beside a brook.' })
      ])
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return

    const validated = toValidatedPlaceNaming(
      { realizePlaceNaming, realizePantheon: async () => ({ ok: false, reason: 'unused' }), sealPlaceNaming },
      outcome.naming
    )
    const updated = persistValidatedSettlementNaming(
      { service: civilization, worldId: 'w1' },
      settlement.civilizationId,
      validated
    )

    expect(updated.displayName).toBe('Millbrook')
    expect(civilization.getCivilization('w1', settlement.civilizationId)?.history).toContain('brook')
    expect(regional.getRegion('w1', settlement.regionId)?.dominantLandType).toBe('grassland')
  })
})

describe('DMEngine -> CivilizationEngine naming contract validation gate (060)', () => {
  it('rejects DM-invented settlement naming that bypasses NarrationEngine validation', () => {
    const dataRoot = tempRoot()
    const { civilization, settlement } = bootstrapWorld(dataRoot)
    const dmInvented = {
      campaignId: 'contract-camp',
      displayName: 'DM Hamlet',
      history: 'Never validated by NarrationEngine.',
      seal: '0000000000000000000000000000000000000000000000000000000000000000'
    } as ValidatedPlaceNaming

    expect(() =>
      persistValidatedSettlementNaming(
        { service: civilization, worldId: 'w1' },
        settlement.civilizationId,
        dmInvented
      )
    ).toThrow(DmNamingError)

    expect(
      civilization.getCivilization('w1', settlement.civilizationId)?.displayName
    ).toBeUndefined()
  })
})

describe('DMEngine -> CivilizationEngine naming contract realize-once (060)', () => {
  it('exposes one-time realize semantics on the real CivilizationEngine API', () => {
    const dataRoot = tempRoot()
    const { civilization, settlement } = bootstrapWorld(dataRoot)

    realizeSettlementNaming(civilization, { worldId: 'w1', civilizationId: settlement.civilizationId }, {
      displayName: 'Named Hamlet',
      history: 'Named once.'
    })

    expect(() =>
      realizeSettlementNaming(civilization, { worldId: 'w1', civilizationId: settlement.civilizationId }, {
        displayName: 'Second Hamlet',
        history: 'Should fail.'
      })
    ).toThrow(/already realized/i)
  })
})

function bootstrapWorld(dataRoot: string) {
  const world = makeWorld()
  const regional = createRegionalService({ dataRoot, world })
  regional.createRegion('w1', {
    regionId: 'region_contract',
    worldId: 'w1',
    dominantLandType: 'grassland',
    landTypeHistogram: { grassland: 1 },
    averageElevation: 0.3,
    minElevation: 0.2,
    maxElevation: 0.4,
    waterContent: 0,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 1,
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    centroid: { x: 0, y: 0 },
    statsVersion: 1,
    extraStats: {},
    cells: [{ x: 0, y: 0 }]
  })
  const civilization = createCivilizationService({ dataRoot, regional, world })
  const settlement = civilization.createCivilization('w1', {
    civilizationId: 'civ_contract',
    worldId: 'w1',
    regionId: 'region_contract',
    kind: 'hamlet',
    origin: { x: 0, y: 0 },
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    seedSalt: 1,
    population: 90,
    overlays: [{ x: 0, y: 0, landUse: 'building' }],
      npcSlots: [{ roleHint: 'resident' }],
    statsVersion: 1,
    extraStats: {}
  })
  return { regional, civilization, settlement }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-contract-'))
  roots.push(root)
  return root
}

function makeWorld() {
  const bounds: Aabb = { minX: 0, minY: 0, maxX: 1, maxY: 1 }
  return {
    getWorldMeta: (worldId: string): WorldMeta => ({
      worldId,
      seed: 1,
      bounds,
      noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      cellCount: 4
    }),
    getExpansion: (_worldId: string, _expansionId: string): ExpansionRecord | null => null,
    getCell: (_args: { worldId: string; x: number; y: number }): Cell | null => null
  }
}

function scriptedCompleter(responses: string[]) {
  let index = 0
  return {
    async completeText() {
      const text = responses[index] ?? responses[responses.length - 1] ?? '{}'
      index += 1
      return { text, backend: 'test' }
    }
  }
}
