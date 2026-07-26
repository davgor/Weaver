import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorldService } from '../store/worldService.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import { WORLD_SLICE_VERSION } from './types.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('WorldEngine campaign portability', () => {
  it('round-trips world metadata for a campaign world', () => {
    const dataRoot = tempRoot()
    const campaignId = 'campaign-world'
    const worldId = campaignId
    const service = createWorldService(dataRoot)
    service.createWorld({
      worldId,
      seed: 77,
      bounds: { minX: 0, minY: 0, maxX: 7, maxY: 7 }
    })

    const ctx = { dataRoot, campaignId, worldId }
    const slice = exportCampaignSlice(ctx)
    expect(slice).toMatchObject({
      sliceVersion: WORLD_SLICE_VERSION,
      campaignId,
      worldId,
      meta: { seed: 77, cellCount: 64 }
    })

    service.deleteWorld(worldId)
    expect(service.hasWorld(worldId)).toBe(false)

    importCampaignSlice(ctx, slice)
    const restored = createWorldService(dataRoot)
    expect(restored.hasWorld(worldId)).toBe(true)
    expect(restored.getWorldMeta(worldId)).toMatchObject({ seed: 77, cellCount: 64 })
    expect(existsSync(join(dataRoot, worldId, 'world.sqlite'))).toBe(true)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'world-portability-'))
  roots.push(root)
  return root
}
