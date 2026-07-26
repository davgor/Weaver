import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  exportWorldCampaignSlice,
  importWorldCampaignSlice,
  createWorldService
} from '@weaver/world-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> WorldEngine export contract', () => {
  it('reads campaign world metadata through the published export API', () => {
    const dataRoot = tempRoot()
    const campaignId = 'contract-world'
    const world = createWorldService(dataRoot)
    world.createWorld({ worldId: campaignId, seed: 5, width: 4, height: 4 })

    const slice = exportWorldCampaignSlice({ dataRoot, campaignId, worldId: campaignId })
    expect(slice.meta.seed).toBe(5)

    world.deleteWorld(campaignId)
    importWorldCampaignSlice({ dataRoot, campaignId, worldId: campaignId }, slice)
    expect(createWorldService(dataRoot).getWorldMeta(campaignId).seed).toBe(5)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'world-export-contract-'))
  roots.push(root)
  return root
}
