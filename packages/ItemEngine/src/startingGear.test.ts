import { describe, expect, it } from 'vitest'
import { createItemService } from './itemService.js'
import {
  EXPECTED_ACTION_ENGINE_ACTION_IDS,
  STARTING_GEAR_ARCHETYPES,
  STARTING_GEAR_CATALOG_VERSION,
  getStartingLoadout
} from './startingGear.js'
import { seedItemTemplateCatalog } from './templateCatalog.js'

describe('starting gear catalog', () => {
  it('has a versioned loadout for every starter archetype', () => {
    expect(STARTING_GEAR_CATALOG_VERSION).toMatch(/\d+\.\d+\.\d+/)

    for (const archetype of STARTING_GEAR_ARCHETYPES) {
      const loadout = getStartingLoadout(archetype)

      expect(loadout.archetype).toBe(archetype)
      expect(loadout.catalogVersion).toBe(STARTING_GEAR_CATALOG_VERSION)
      expect(loadout.items.length).toBeGreaterThan(0)
      expect(loadout.actionIds.length).toBeGreaterThan(0)
    }
  })

  it('uses template ids that resolve after seeding the item template catalog', () => {
    const service = createItemService()
    seedItemTemplateCatalog(service)

    for (const archetype of STARTING_GEAR_ARCHETYPES) {
      for (const item of getStartingLoadout(archetype).items) {
        expect(item.quantity).toBeGreaterThan(0)
        expect(service.getTemplate(item.templateId).id).toBe(item.templateId)
      }
    }
  })

  it('documents starter known-action grants as ActionEngine action id strings', () => {
    expect(EXPECTED_ACTION_ENGINE_ACTION_IDS).toEqual(['ice_bolt', 'hamstring_strike'])

    for (const archetype of STARTING_GEAR_ARCHETYPES) {
      for (const actionId of getStartingLoadout(archetype).actionIds) {
        expect(EXPECTED_ACTION_ENGINE_ACTION_IDS).toContain(actionId)
      }
    }
  })
})
