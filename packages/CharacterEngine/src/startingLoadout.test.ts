import { beforeEach, describe, expect, it } from 'vitest'
import { getItemTemplateCatalog } from '@weaver/item-engine'
import { ARCHETYPE_IDS } from './archetypes.js'
import { listKnownActions } from './records.js'
import {
  clearStartingLoadoutStore,
  getCharacterArchetype,
  getCharacterStartingLoadout,
  resolveDefaultStartingLoadout,
  selectStartingLoadout
} from './startingLoadout.js'

describe('starting loadout selection', () => {
  beforeEach(() => {
    clearStartingLoadoutStore()
  })

  it('resolves each archetype default loadout to valid ItemEngine template ids', () => {
    const templateIds = new Set(getItemTemplateCatalog().map((template) => template.id))

    for (const archetype of ARCHETYPE_IDS) {
      const loadout = resolveDefaultStartingLoadout(archetype)
      expect(loadout.archetype).toBe(archetype)
      expect(loadout.items.length).toBeGreaterThan(0)
      for (const item of loadout.items) {
        expect(templateIds.has(item.templateId)).toBe(true)
        expect(item.quantity).toBeGreaterThan(0)
      }
      expect(loadout.actionIds.length).toBeGreaterThan(0)
    }
  })

  it('persists chosen gear and known ActionEngine action ids on the character', () => {
    const persisted = selectStartingLoadout('pc-fighter', 'Fighter')

    expect(persisted).toMatchObject({
      characterId: 'pc-fighter',
      archetype: 'Fighter'
    })
    expect(persisted.items.length).toBeGreaterThan(0)
    expect(getCharacterStartingLoadout('pc-fighter')).toEqual(persisted)
    expect(getCharacterArchetype('pc-fighter')).toBe('Fighter')
    expect(listKnownActions('pc-fighter')).toEqual([...persisted.actionIds].sort())
  })
})
