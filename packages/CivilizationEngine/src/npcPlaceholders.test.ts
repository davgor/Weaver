import { beforeEach, describe, expect, it } from 'vitest'
import {
  claimNpcPlaceholder,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders,
  listNpcPlaceholders,
  listUnassignedNpcPlaceholders,
  releaseNpcPlaceholder
} from './npcPlaceholders.js'

describe('CivilizationEngine NPC placeholders', () => {
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
    expect(slots.every((slot) => slot.status === 'unassigned')).toBe(true)
    expect(slots.every((slot) => slot.assignedNpcId === undefined)).toBe(true)
    expect(listNpcPlaceholders('w1', 'c1')).toHaveLength(2)
  })

  it('claims and releases slots with edge-case guards', () => {
    const [slot] = ensureNpcPlaceholders({
      worldId: 'w1',
      civilizationId: 'c1',
      regionId: 'r1',
      roleHints: ['merchant']
    })
    const claimed = claimNpcPlaceholder('w1', slot.slotId, 'npc-1')
    expect(claimed.status).toBe('assigned')
    expect(claimed.assignedNpcId).toBe('npc-1')
    expect(listUnassignedNpcPlaceholders('w1')).toHaveLength(0)

    expect(() => claimNpcPlaceholder('w1', slot.slotId, 'npc-2')).toThrow(/already assigned/)
    expect(() => claimNpcPlaceholder('w1', 'missing', 'npc-3')).toThrow(/not found/)

    const released = releaseNpcPlaceholder('w1', slot.slotId)
    expect(released.status).toBe('unassigned')
    expect(released.assignedNpcId).toBeUndefined()
    expect(listUnassignedNpcPlaceholders('w1', { roleHint: 'merchant' })).toHaveLength(1)
  })
})
