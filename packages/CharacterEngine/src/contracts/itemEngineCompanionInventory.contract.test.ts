import { beforeEach, describe, expect, it } from 'vitest'
import {
  createItemService,
  seedItemTemplateCatalog
} from '@weaver/item-engine'
import { clearCharacterStatsStore } from '../hp.js'
import { clearCompanionStore, createCompanion } from '../companions.js'
import {
  clearStartingLoadoutStore,
  getCharacterStartingLoadout,
  selectStartingLoadout
} from '../startingLoadout.js'

describe('CharacterEngine -> ItemEngine companion inventory contract', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
  })

  it('creates companion gear inventory through ItemEngine public APIs', () => {
    const itemService = createItemService()
    seedItemTemplateCatalog(itemService)
    selectStartingLoadout('pc-owner', 'Fighter')

    const companion = createCompanion({
      ownerCharacterId: 'pc-owner',
      campaignId: 'camp-contract',
      name: 'Mira',
      archetype: 'Rogue',
      bodyMod: 0
    })

    const loadout = getCharacterStartingLoadout(companion.characterId)
    expect(loadout).toBeDefined()

    const inventory = itemService.createInventory(companion.characterId)
    expect(inventory.characterId).toBe(companion.characterId)

    for (const item of loadout!.items) {
      itemService.addItem(companion.characterId, item.templateId)
    }

    const listed = itemService.listInventory(companion.characterId)
    expect(listed.held.length).toBe(loadout!.items.length)
    expect(listed.held.every((entry) => entry.template.id.length > 0)).toBe(true)
  })
})
