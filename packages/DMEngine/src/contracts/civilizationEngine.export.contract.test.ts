import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCivilizationStore,
  exportCivilizationCampaignSlice,
  importCivilizationCampaignSlice
} from '@weaver/civilization-engine'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine -> CivilizationEngine export contract', () => {
  it('reads settlement placeholders through the published export API', () => {
    const dataRoot = tempRoot()
    const campaignId = 'contract-civ'
    const store = createCivilizationStore(dataRoot)
    const timestamp = '2026-01-01T00:00:00.000Z'
    store.saveCivilization(
      {
        civilizationId: 'civ-contract',
        worldId: campaignId,
        regionId: 'region-a',
        kind: 'hamlet',
        origin: { x: 1, y: 1 },
        bounds: { minX: 1, minY: 1, maxX: 1, maxY: 1 },
        seedSalt: 1,
        population: 10,
        npcSlotCount: 1,
        npcSlotsAssigned: 0,
        statsVersion: 1,
        extraStats: {},
        displayName: 'Contract Hamlet',
        createdAt: timestamp,
        updatedAt: timestamp
      },
      [{ x: 1, y: 1 }]
    )
    store.saveSlots([
      {
        slotId: 'civ-contract:guard:1',
        civilizationId: 'civ-contract',
        worldId: campaignId,
        regionId: 'region-a',
        roleHint: 'guard',
        status: 'unassigned'
      }
    ])

    const slice = exportCivilizationCampaignSlice({ dataRoot, campaignId, worldId: campaignId })
    expect(slice.civilizations[0]?.record.displayName).toBe('Contract Hamlet')
    expect(slice.slots).toHaveLength(1)

    store.clearCivilizations(campaignId)
    importCivilizationCampaignSlice({ dataRoot, campaignId, worldId: campaignId }, slice)
    expect(createCivilizationStore(dataRoot).listSlots(campaignId)).toHaveLength(1)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'civ-export-contract-'))
  roots.push(root)
  return root
}
