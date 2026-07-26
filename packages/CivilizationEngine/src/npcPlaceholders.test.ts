import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyClaim,
  applyRelease,
  assertRoleHint,
  buildSlotId,
  claimNpcPlaceholder,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders,
  listNpcPlaceholders,
  listUnassignedNpcPlaceholders,
  matchesUnassignedFilter,
  releaseNpcPlaceholder,
  type NpcPlaceholderSlot
} from './npcPlaceholders.js'

function slot(overrides: Partial<NpcPlaceholderSlot> = {}): NpcPlaceholderSlot {
  return {
    slotId: 'c1:resident:1',
    civilizationId: 'c1',
    worldId: 'w1',
    regionId: 'r1',
    roleHint: 'resident',
    status: 'unassigned',
    ...overrides
  }
}

describe('NPC placeholder helpers', () => {
  it('claims and releases without constructing NPC actors', () => {
    const claimed = applyClaim(slot(), 'npc-1')
    expect(claimed.status).toBe('assigned')
    expect(claimed.assignedNpcId).toBe('npc-1')
    expect(() => applyClaim(claimed, 'npc-2')).toThrow(/already assigned/)
    expect(() => applyClaim(slot(), '  ')).toThrow(/npcId is required/)
    const released = applyRelease(claimed)
    expect(released.status).toBe('unassigned')
    expect(released.assignedNpcId).toBeUndefined()
  })

  it('filters unassigned slots and validates role hints', () => {
    expect(matchesUnassignedFilter(slot({ roleHint: 'merchant' }), { roleHint: 'merchant' })).toBe(
      true
    )
    expect(matchesUnassignedFilter(slot({ regionId: 'r2' }), { regionId: 'r1' })).toBe(false)
    expect(() => assertRoleHint('wizard')).toThrow(/Unknown NPC role hint/)
    expect(buildSlotId('c1', 'guard', 3)).toBe('c1:guard:3')
  })
})

describe('NPC placeholder in-memory store', () => {
  beforeEach(() => {
    clearNpcPlaceholderStore()
  })

  it('creates unassigned slots without constructing NPCs', () => {
    const slots = ensureNpcPlaceholders({
      worldId: 'w1',
      civilizationId: 'c1',
      regionId: 'r1',
      roleHints: ['resident', 'guard']
    })
    expect(slots).toHaveLength(2)
    expect(slots.every((entry) => entry.status === 'unassigned')).toBe(true)
    expect(listNpcPlaceholders('w1', 'c1')).toHaveLength(2)
  })

  it('claims and releases slots with edge-case guards', () => {
    const [created] = ensureNpcPlaceholders({
      worldId: 'w1',
      civilizationId: 'c1',
      regionId: 'r1',
      roleHints: ['merchant']
    })
    if (!created) throw new Error('expected slot')
    const claimed = claimNpcPlaceholder('w1', created.slotId, 'npc-1')
    expect(claimed.status).toBe('assigned')
    expect(listUnassignedNpcPlaceholders('w1')).toHaveLength(0)
    expect(() => claimNpcPlaceholder('w1', created.slotId, 'npc-2')).toThrow(/already assigned/)
    expect(() => claimNpcPlaceholder('w1', 'missing', 'npc-3')).toThrow(/not found/)
    const released = releaseNpcPlaceholder('w1', created.slotId)
    expect(released.status).toBe('unassigned')
    expect(listUnassignedNpcPlaceholders('w1', { roleHint: 'merchant' })).toHaveLength(1)
  })
})
