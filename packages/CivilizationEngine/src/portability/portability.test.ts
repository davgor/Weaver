import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCivilizationStore } from '../store/civilizationStore.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('CivilizationEngine campaign portability', () => {
  it('round-trips settlement placeholders for a campaign world', () => {
    const dataRoot = tempRoot()
    const campaignId = 'campaign-civ'
    const worldId = campaignId
    const store = createCivilizationStore(dataRoot)
    const timestamp = '2026-01-01T00:00:00.000Z'
    const record = store.saveCivilization(
      {
        civilizationId: 'civ-hamlet',
        worldId,
        regionId: 'region-north',
        kind: 'hamlet',
        origin: { x: 2, y: 2 },
        bounds: { minX: 2, minY: 2, maxX: 3, maxY: 3 },
        seedSalt: 1,
        population: 120,
        npcSlotCount: 1,
        npcSlotsAssigned: 0,
        statsVersion: 1,
        extraStats: {},
        displayName: 'Ashford',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      [
        { x: 2, y: 2 },
        { x: 3, y: 2 }
      ]
    )
    store.saveSlots([
      {
        slotId: 'civ-hamlet:merchant:1',
        civilizationId: record.civilizationId,
        worldId,
        regionId: 'region-north',
        roleHint: 'merchant',
        status: 'unassigned'
      }
    ])

    const ctx = { dataRoot, campaignId, worldId }
    const slice = exportCampaignSlice(ctx)
    expect(slice.civilizations).toHaveLength(1)
    expect(slice.civilizations[0]?.record.displayName).toBe('Ashford')
    expect(slice.slots).toHaveLength(1)

    store.clearCivilizations(worldId)
    expect(store.listCivilizations(worldId)).toEqual([])

    importCampaignSlice(ctx, slice)
    const restored = createCivilizationStore(dataRoot)
    expect(restored.listCivilizations(worldId).map((entry) => entry.civilizationId)).toEqual([
      'civ-hamlet'
    ])
    expect(restored.listSlots(worldId)).toHaveLength(1)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'civ-portability-'))
  roots.push(root)
  return root
}
