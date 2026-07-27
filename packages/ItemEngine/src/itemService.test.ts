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
      enchantmentOverlays: [
        { overlayId: 'overlay.good-luck', kind: 'onHit', onHitEffectId: 'effect.good-luck' }
      ]
    })

    service.equip('character.a', armor.id, 'armor')
    service.equip('character.a', ring.id, 'accessories')
    service.unequip('character.a', 'armor')
    service.unequip('character.a', ring.id)

    const held = service.listInventory('character.a').held
    expect(held.map((item) => item.instance.id).sort()).toEqual([armor.id, ring.id].sort())
    expect(held.find((item) => item.instance.id === armor.id)?.instance.durability).toBe(3)
    expect(held.find((item) => item.instance.id === ring.id)?.instance.enchantmentOverlays).toEqual([
      { overlayId: 'overlay.good-luck', kind: 'onHit', onHitEffectId: 'effect.good-luck' }
    ])
  })
})

describe('item service transfers', () => {
  it('moves ownership, unequips from the source, and rejects dual ownership', () => {
    const service = seededService()
    service.createInventory('character.a')
    service.createInventory('character.b')
    const sword = service.addItem('character.a', 'template.longsword', {
      durability: 7,
      customName: 'Gatekeeper'
    })

    service.equip('character.a', sword.id, 'mainHand')
    const transferred = service.transferItem('character.a', 'character.b', sword.id)

    expect(transferred.held.map((item) => item.instance.id)).toEqual([sword.id])
    expect(transferred.held[0]?.instance).toMatchObject({ durability: 7, customName: 'Gatekeeper' })
    expect(service.listInventory('character.a').held).toEqual([])
    expect(service.getEquipped('character.a').mainHand).toBeUndefined()
    expect(() => service.transferItem('character.a', 'character.b', sword.id)).toThrow(/not owned/i)
  })
})

describe('item service enchantments', () => {
  it('applies and removes enchantment overlays through the service mutation API', () => {
    const service = createItemService()
    service.defineTemplate({
      id: 'template.flaming-longsword',
      name: 'Flaming Longsword',
      equipmentSlots: ['mainHand'],
      tags: ['weapon'],
      weaponDamage: [{ damageType: 'Physical', amount: 6 }]
    })
    service.createInventory('character.a')
    const sword = service.addItem('character.a', 'template.flaming-longsword')

    const enchanted = service.applyEnchantment(sword.id, {
      overlayId: 'overlay.flame',
      kind: 'damage',
      damageType: 'Fire',
      bonus: 2
    })

    expect(enchanted.enchantmentOverlays).toEqual([
      { overlayId: 'overlay.flame', kind: 'damage', damageType: 'Fire', bonus: 2 }
    ])
    expect(service.getWeaponDamageProfile(sword.id).damageComponents).toEqual([
      { damageType: 'Physical', amount: 6 },
      { damageType: 'Fire', amount: 2 }
    ])

    const cleaned = service.removeEnchantment(sword.id, 'overlay.flame')
    expect(cleaned.enchantmentOverlays).toBeUndefined()
    expect(service.getWeaponDamageProfile(sword.id).damageComponents).toEqual([
      { damageType: 'Physical', amount: 6 }
    ])
  })
})

describe('item service validation and edge cases', () => {
  it('rejects duplicate templates and blank ids', () => {
    const service = createItemService()
    service.defineTemplate({ id: 'template.a', name: 'A' })

    expect(() => service.defineTemplate({ id: 'template.a', name: 'Duplicate' })).toThrow(
      /already exists/i
    )
    expect(() => service.defineTemplate({ id: '  ', name: 'Blank' })).toThrow(/required/i)
    expect(() => service.defineTemplate({ id: 'template.b', name: ' ' })).toThrow(/required/i)
  })

  it('rejects equipping into occupied slots and missing held items', () => {
    const service = seededService()
    service.createInventory('character.a')
    const sword = service.addItem('character.a', 'template.longsword')
    const secondSword = service.addItem('character.a', 'template.longsword')

    service.equip('character.a', sword.id, 'mainHand')
    expect(() => service.equip('character.a', secondSword.id, 'mainHand')).toThrow(/occupied/i)
    expect(() => service.equip('character.a', 'item.missing', 'mainHand')).toThrow(/not found/i)
    expect(() => service.equip('character.a', sword.id, 'mainHand')).toThrow(/already equipped/i)
  })

  it('unequips accessories in bulk and by instance id', () => {
    const service = seededService()
    service.createInventory('character.a')
    const ringA = service.addItem('character.a', 'template.ring')
    const ringB = service.addItem('character.a', 'template.ring')

    service.equip('character.a', ringA.id, 'accessories')
    service.equip('character.a', ringB.id, 'accessories')
    service.unequip('character.a', 'accessories')

    expect(service.listInventory('character.a').held).toHaveLength(2)
    expect(() => service.unequip('character.a', 'accessories')).toThrow(/empty/i)
  })

  it('exposes item instances and rejects unequipping unknown equipment', () => {
    const service = seededService()
    service.createInventory('character.a')
    const sword = service.addItem('character.a', 'template.longsword', { charges: 2 })

    expect(service.getItemInstance(sword.id).charges).toBe(2)
    expect(() => service.unequip('character.a', 'armor')).toThrow(/empty/i)
    expect(() => service.unequip('character.a', 'item.missing')).toThrow(/not found/i)
  })
})
