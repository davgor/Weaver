import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createRegionStore } from '../store/regionStore.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('RegionalEngine campaign portability', () => {
  it('round-trips region names for a campaign world', () => {
    const dataRoot = tempRoot()
    const campaignId = 'campaign-regional'
    const worldId = campaignId
    const service = createRegionStore(dataRoot)
    const timestamp = '2026-01-01T00:00:00.000Z'
    const record = service.saveRegion(
      {
        regionId: 'region-north',
        worldId,
        sourceExpansionId: 'expansion_0',
        dominantLandType: 'forest',
        landTypeHistogram: { forest: 4 },
        averageElevation: 0.4,
        minElevation: 0.3,
        maxElevation: 0.5,
        waterContent: 0,
        isOcean: false,
        touchesOcean: false,
        isLandlocked: true,
        cellCount: 4,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
        centroid: { x: 0.5, y: 0.5 },
        statsVersion: 1,
        extraStats: {},
        displayName: 'North Reach',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 }
      ]
    )

    const ctx = { dataRoot, campaignId, worldId }
    const slice = exportCampaignSlice(ctx)
    expect(slice.regions).toHaveLength(1)
    expect(slice.regions[0]?.record.displayName).toBe('North Reach')

    service.clearRegions(worldId)
    expect(service.listRegions(worldId)).toEqual([])

    importCampaignSlice(ctx, slice)
    const restored = createRegionStore(dataRoot)
    expect(restored.listRegions(worldId).map((entry) => entry.regionId)).toEqual([record.regionId])
    expect(restored.getRegion(worldId, record.regionId)?.displayName).toBe('North Reach')
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'regional-portability-'))
  roots.push(root)
  return root
}
