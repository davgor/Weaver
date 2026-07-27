import { beforeEach, describe, expect, it } from 'vitest'
import { itemEngine, unbindItemCampaignStores } from '../engineApi.js'
import { createEmptyEquippedItems } from '../types.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  ITEM_SLICE_VERSION,
  ItemPortabilitySchemaError,
  type ItemCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-item'
const CHARACTER_ID = 'pc-item'
const SECOND_CHARACTER_ID = 'pc-item-second'

beforeEach(() => {
  unbindItemCampaignStores()
  itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
})

describe('ItemEngine campaign portability', () => {
  it('exports templates, instances, inventory membership, equipment, and balances', () => {
    expectFullPortableSliceExport()
  })

  it('imports by replacing campaign item state without duplicating restored instances', () => {
    expectImportReplacesCampaignItems()
  })

  it('round-trips currency balances for campaign characters', () => {
    itemEngine.credit(CHARACTER_ID, 42)

    const ctx = { campaignId: CAMPAIGN_ID, characterIds: [CHARACTER_ID] }
    const slice = exportCampaignSlice(ctx)
    expect(slice.balances).toEqual({ [CHARACTER_ID]: 42 })

    itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0 })
    importCampaignSlice(ctx, slice)
    expect(itemEngine.getBalance(CHARACTER_ID)).toBe(42)
  })
})

describe('ItemEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 1 as typeof ITEM_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(ItemPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported item slice version/)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(ItemPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): {
  ctx: { campaignId: string; characterIds: string[] }
  slice: ItemCampaignSlice
} {
  seedPortableCampaignItems()
  itemEngine.credit(CHARACTER_ID, 12)
  const ctx = portabilityContext()
  return { ctx, slice: exportCampaignSlice(ctx) }
}

function expectFullPortableSliceExport(): void {
  seedPortableCampaignItems()
  itemEngine.credit(CHARACTER_ID, 42)
  itemEngine.credit(SECOND_CHARACTER_ID, 7)
  const slice = exportCampaignSlice(portabilityContext())
  expect(slice.sliceVersion).toBe(2)
  expect(slice.balances).toEqual({ [CHARACTER_ID]: 42, [SECOND_CHARACTER_ID]: 7 })
  expectPortableTemplates(slice)
  expectPortableInstances(slice)
  expectPortableInventories(slice)
}

function expectImportReplacesCampaignItems(): void {
  const slice = seedAndExport().slice
  seedConflictingCampaignItemState()
  importCampaignSlice(portabilityContext(), slice)
  importCampaignSlice(portabilityContext(), slice)
  const primaryInventory = itemEngine.listInventory(CHARACTER_ID)
  const secondaryInventory = itemEngine.listInventory(SECOND_CHARACTER_ID)
  expect(primaryInventory.held).toEqual([])
  expect(primaryInventory.equipped.mainHand?.instance.id).toBe('item.1')
  expect(primaryInventory.equipped.accessories.map((item) => item.instance.id)).toEqual(['item.2'])
  expect(secondaryInventory.held.map((item) => item.instance.id)).toEqual(['item.3'])
  expect(itemEngine.getItemInstance('item.1')).toMatchObject({ id: 'item.1', customName: 'Dawnkeeper' })
  expect(itemEngine.getBalance(CHARACTER_ID)).toBe(12)
  expect(itemEngine.addItem(SECOND_CHARACTER_ID, 'template.portable-potion').id).toBe('item.4')
}

function expectPortableTemplates(slice: ItemCampaignSlice): void {
  expect(slice.templates.map((template) => template.id).sort()).toEqual([
    'template.portable-potion',
    'template.portable-ring',
    'template.portable-sword'
  ])
}

function expectPortableInstances(slice: ItemCampaignSlice): void {
  expect(slice.instances).toEqual([
    {
      id: 'item.1',
      templateId: 'template.portable-sword',
      ownerCharacterId: CHARACTER_ID,
      customName: 'Dawnkeeper',
      durability: 8
    },
    expectedPortableRingInstance(),
    { id: 'item.3', templateId: 'template.portable-potion', ownerCharacterId: SECOND_CHARACTER_ID, charges: 2 }
  ])
}

function expectedPortableRingInstance(): ItemCampaignSlice['instances'][number] {
  return {
    id: 'item.2',
    templateId: 'template.portable-ring',
    ownerCharacterId: CHARACTER_ID,
    enchantmentOverlays: [
      { overlayId: 'overlay.focus', kind: 'onHit', onHitEffectId: 'effect.focus' }
    ]
  }
}

function expectPortableInventories(slice: ItemCampaignSlice): void {
  expect(slice.inventories).toEqual([
    {
      characterId: CHARACTER_ID,
      heldItemIds: [],
      equipped: { mainHand: 'item.1', accessories: ['item.2'] }
    },
    {
      characterId: SECOND_CHARACTER_ID,
      heldItemIds: ['item.3'],
      equipped: createEmptyEquippedItems()
    }
  ])
}

function seedConflictingCampaignItemState(): void {
  itemEngine.unequip(CHARACTER_ID, 'item.1')
  itemEngine.defineTemplate({ id: 'template.portable-torch', name: 'Torch' })
  itemEngine.addItem(CHARACTER_ID, 'template.portable-torch')
  itemEngine.restoreCampaignBalances({ [CHARACTER_ID]: 0, [SECOND_CHARACTER_ID]: 0 })
}

function portabilityContext(): { campaignId: string; characterIds: string[] } {
  return { campaignId: CAMPAIGN_ID, characterIds: [CHARACTER_ID, SECOND_CHARACTER_ID] }
}

function seedPortableCampaignItems(): void {
  itemEngine.defineTemplate({
    id: 'template.portable-sword',
    name: 'Portable Sword',
    equipmentSlots: ['mainHand'],
    tags: ['weapon']
  })
  itemEngine.defineTemplate({
    id: 'template.portable-ring',
    name: 'Portable Ring',
    equipmentSlots: ['accessories'],
    tags: ['accessory']
  })
  itemEngine.defineTemplate({
    id: 'template.portable-potion',
    name: 'Portable Potion',
    tags: ['consumable']
  })
  itemEngine.createInventory(CHARACTER_ID)
  itemEngine.createInventory(SECOND_CHARACTER_ID)
  itemEngine.addItem(CHARACTER_ID, 'template.portable-sword', {
    customName: 'Dawnkeeper',
    durability: 8
  })
  itemEngine.addItem(CHARACTER_ID, 'template.portable-ring', {
    enchantmentOverlays: [
      { overlayId: 'overlay.focus', kind: 'onHit', onHitEffectId: 'effect.focus' }
    ]
  })
  itemEngine.addItem(SECOND_CHARACTER_ID, 'template.portable-potion', { charges: 2 })
  itemEngine.equip(CHARACTER_ID, 'item.1', 'mainHand')
  itemEngine.equip(CHARACTER_ID, 'item.2', 'accessories')
}
