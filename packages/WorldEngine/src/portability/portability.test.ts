import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorldService } from '../store/worldService.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  WORLD_SLICE_VERSION,
  WorldPortabilitySchemaError,
  type WorldCampaignSlice,
  type WorldPortabilityContext
} from './types.js'

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

describe('WorldEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof WORLD_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(WorldPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported world slice version/)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(WorldPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })

  it('rejects worldId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, worldId: 'other-world' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(WorldPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/worldId mismatch/)
  })
})

describe('WorldEngine campaign portability export errors', () => {
  it('throws when the campaign world is missing', () => {
    const dataRoot = tempRoot()
    const ctx: WorldPortabilityContext = {
      dataRoot,
      campaignId: 'campaign-missing',
      worldId: 'campaign-missing'
    }
    expect(() => exportCampaignSlice(ctx)).toThrow(/World not found for campaign export/)
  })
})

function seedAndExport(): { ctx: WorldPortabilityContext; slice: WorldCampaignSlice } {
  const dataRoot = tempRoot()
  const campaignId = 'campaign-world-schema'
  const worldId = campaignId
  createWorldService(dataRoot).createWorld({
    worldId,
    seed: 77,
    bounds: { minX: 0, minY: 0, maxX: 7, maxY: 7 }
  })
  const ctx = { dataRoot, campaignId, worldId }
  return { ctx, slice: exportCampaignSlice(ctx) }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'world-portability-'))
  roots.push(root)
  return root
}
