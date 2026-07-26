import { describe, expect, it } from 'vitest'
import {
  STARTING_GEAR_ARCHETYPES,
  STARTING_GEAR_CATALOG_VERSION,
  getItemTemplateCatalog,
  getStartingLoadout,
  isStartingGearArchetype
} from '@weaver/item-engine'
import { ARCHETYPE_IDS, isArchetypeId } from '../archetypes.js'
import {
  resolveDefaultStartingLoadout,
  selectStartingLoadout
} from '../startingLoadout.js'

describe('CharacterEngine -> ItemEngine starting-loadout contract', () => {
  it('shares stable archetype keys with ItemEngine starting-gear archetypes', () => {
    expect([...ARCHETYPE_IDS]).toEqual([...STARTING_GEAR_ARCHETYPES])
    for (const archetype of ARCHETYPE_IDS) {
      expect(isStartingGearArchetype(archetype)).toBe(true)
      expect(isArchetypeId(archetype)).toBe(true)
    }
  })

  it('resolves defaults through ItemEngine getStartingLoadout without mocking', () => {
    const templateIds = new Set(getItemTemplateCatalog().map((template) => template.id))

    for (const archetype of ARCHETYPE_IDS) {
      const fromItemEngine = getStartingLoadout(archetype)
      const fromCharacterEngine = resolveDefaultStartingLoadout(archetype)

      expect(fromCharacterEngine).toEqual(fromItemEngine)
      expect(fromItemEngine.catalogVersion).toBe(STARTING_GEAR_CATALOG_VERSION)
      for (const item of fromItemEngine.items) {
        expect(templateIds.has(item.templateId)).toBe(true)
      }
    }
  })

  it('persists the real ItemEngine catalog payload when selecting a loadout', () => {
    const catalogLoadout = getStartingLoadout('Mage')
    const persisted = selectStartingLoadout('pc-contract-mage', 'Mage')

    expect(persisted.catalogVersion).toBe(catalogLoadout.catalogVersion)
    expect(persisted.items).toEqual(catalogLoadout.items)
    expect(persisted.actionIds).toEqual(catalogLoadout.actionIds)
  })
})
