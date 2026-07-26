import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCivilizationStore } from './civilizationStore.js'
import type { CivilizationRecord } from '../types.js'

const roots: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-civ-schema-'))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function sampleRecord(overrides: Partial<CivilizationRecord> = {}): CivilizationRecord {
  return {
    civilizationId: 'civ_1',
    worldId: 'w1',
    regionId: 'r1',
    kind: 'village',
    origin: { x: 1, y: 2 },
    bounds: { minX: 1, minY: 2, maxX: 3, maxY: 4 },
    centroid: { x: 2, y: 3 },
    seedSalt: 42,
    population: 80,
    npcSlotCount: 4,
    npcSlotsAssigned: 1,
    statsVersion: 1,
    extraStats: {},
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('CivilizationEngine schema persistence', () => {
  it('persists and reloads civilization, population fields, and NPC placeholders', () => {
    const dataRoot = tempRoot()
    const store = createCivilizationStore(dataRoot)
    const record = sampleRecord()
    store.saveCivilization(record, [
      { x: 1, y: 2 },
      { x: 2, y: 2 }
    ])
    store.saveSlots([
      {
        slotId: 'civ_1:resident:1',
        civilizationId: 'civ_1',
        worldId: 'w1',
        regionId: 'r1',
        roleHint: 'resident',
        status: 'assigned',
        assignedNpcId: 'npc-1'
      },
      {
        slotId: 'civ_1:merchant:2',
        civilizationId: 'civ_1',
        worldId: 'w1',
        regionId: 'r1',
        roleHint: 'merchant',
        status: 'unassigned'
      }
    ])

    expect(existsSync(join(dataRoot, 'w1', 'civilizations.sqlite'))).toBe(true)
    const reopened = createCivilizationStore(dataRoot)
    expect(reopened.getCivilization('w1', 'civ_1')).toEqual(record)
    expect(reopened.getAt('w1', 2, 2)?.civilizationId).toBe('civ_1')
    expect(reopened.listSlots('w1', 'civ_1')).toHaveLength(2)
    expect(
      reopened.listSlots('w1', 'civ_1').find((slot) => slot.roleHint === 'resident')?.assignedNpcId
    ).toBe('npc-1')
  })
})
