import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  exportRegionalCampaignSlice,
  importRegionalCampaignSlice,
  createRegionStore
} from '@weaver/regional-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> RegionalEngine export contract', () => {
  it('reads region names through the published export API', () => {
    const dataRoot = tempRoot()
    const campaignId = 'contract-regional'
    const store = createRegionStore(dataRoot)
    const timestamp = '2026-01-01T00:00:00.000Z'
    store.saveRegion(
      {
        regionId: 'region-a',
        worldId: campaignId,
        dominantLandType: 'forest',
        landTypeHistogram: { forest: 1 },
        averageElevation: 0.4,
        minElevation: 0.4,
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
        displayName: 'Contract Region',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      [{ x: 0, y: 0 }]
    )

    const slice = exportRegionalCampaignSlice({ dataRoot, campaignId, worldId: campaignId })
    expect(slice.regions[0]?.record.displayName).toBe('Contract Region')

    store.clearRegions(campaignId)
    importRegionalCampaignSlice({ dataRoot, campaignId, worldId: campaignId }, slice)
    expect(createRegionStore(dataRoot).getRegion(campaignId, 'region-a')?.displayName).toBe(
      'Contract Region'
    )
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'regional-export-contract-'))
  roots.push(root)
  return root
}
