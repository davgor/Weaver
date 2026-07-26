import { describe, expect, it } from 'vitest'
import { createItemService } from './itemService.js'

function seededService() {
  const service = createItemService()
  service.defineTemplate({
    id: 'template.longsword',
    name: 'Longsword',
    equipmentSlots: ['mainHand', 'offHand'],
    tags: ['weapon']
  })
  service.defineTemplate({
    id: 'template.shield',
    name: 'Round Shield',
    equipmentSlots: ['shield'],
    tags: ['shield']
  })
  service.defineTemplate({
    id: 'template.armor',
    name: 'Chain Shirt',
    equipmentSlots: ['armor'],
    tags: ['armor']
  })
  service.defineTemplate({
    id: 'template.ring',
    name: 'Copper Ring',
    equipmentSlots: ['accessories'],
    tags: ['accessory']
  })
  service.defineTemplate({
    id: 'template.potion',
    name: 'Healing Potion',
    tags: ['consumable']
  })
  return service
}

describe('item service inventories', () => {
  it('creates inventories, adds instances, and separates facts from state', () => {
    const service = seededService()
    service.createInventory('character.a')

    const added = service.addItem('character.a', 'template.longsword', {
      durability: 9,
      customName: 'Gatekeeper'
    })
    const inventory = service.listInventory('character.a')

    expect(added.templateId).toBe('template.longsword')
    expect(added.customName).toBe('Gatekeeper')
    expect(inventory.held).toHaveLength(1)
    expect(inventory.held[0]?.template.name).toBe('Longsword')
    expect(inventory.held[0]?.instance.durability).toBe(9)
    expect(inventory.equipped.accessories).toEqual([])
  })

  it('rejects missing templates and inventories', () => {
    const service = seededService()
    service.createInventory('character.a')

    expect(() => service.addItem('character.a', 'template.missing')).toThrow(/Template not found/)
    expect(() => service.addItem('character.missing', 'template.longsword')).toThrow(/Inventory not found/)
  })
})

describe('item service equipment', () => {
  it('equips compatible items and keeps incompatible items held', () => {
    const service = seededService()
    service.createInventory('character.a')
    const sword = service.addItem('character.a', 'template.longsword')
    const armor = service.addItem('character.a', 'template.armor', { durability: 4 })

    service.equip('character.a', sword.id, 'mainHand')

    expect(service.getEquipped('character.a').mainHand?.instance.id).toBe(sword.id)
    expect(service.listInventory('character.a').held.map((item) => item.instance.id)).toEqual([armor.id])
    expect(() => service.equip('character.a', armor.id, 'mainHand')).toThrow(/not compatible/)
    expect(service.listInventory('character.a').held.map((item) => item.instance.id)).toEqual([armor.id])
  })

  it('unequips by slot or instance id without destroying instance state', () => {
    const service = seededService()
    service.createInventory('character.a')
    const armor = service.addItem('character.a', 'template.armor', { durability: 3 })
    const ring = service.addItem('character.a', 'template.ring', {
      customName: 'Aunt Mirra’s Ring',
      enchantmentRefs: ['enchantment.good-luck']
    })

    service.equip('character.a', armor.id, 'armor')
    service.equip('character.a', ring.id, 'accessories')
    service.unequip('character.a', 'armor')
    service.unequip('character.a', ring.id)

    const held = service.listInventory('character.a').held
    expect(held.map((item) => item.instance.id).sort()).toEqual([armor.id, ring.id].sort())
    expect(held.find((item) => item.instance.id === armor.id)?.instance.durability).toBe(3)
    expect(held.find((item) => item.instance.id === ring.id)?.instance.enchantmentRefs).toEqual([
      'enchantment.good-luck'
    ])
  })
})
