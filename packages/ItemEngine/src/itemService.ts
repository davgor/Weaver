import {
  applyEnchantmentOverlay,
  listEnchantmentOverlays,
  removeEnchantmentOverlay
} from './enchantmentModifications.js'
import type { EnchantmentOverlay } from './enchantmentTypes.js'
import {
  createEmptyEquippedItems,
  isFixedEquipmentSlot,
  type EquipmentSlot,
  type EquippedItemViews,
  type EquippedItems,
  type FixedEquipmentSlot,
  type InventorySnapshot,
  type ItemInstance,
  type ItemInstanceState,
  type ItemTemplate,
  type ItemView
} from './types.js'
import type { WeaponDamageProfile } from './enchantmentTypes.js'
import { buildWeaponDamageProfile } from './weaponDamage.js'

type InventoryRecord = {
  characterId: string
  heldItemIds: string[]
  equipped: EquippedItems
}

export type ItemService = {
  defineTemplate: (template: ItemTemplate) => ItemTemplate
  getTemplate: (templateId: string) => ItemTemplate
  createInventory: (characterId: string) => InventorySnapshot
  addItem: (characterId: string, templateId: string, state?: ItemInstanceState) => ItemInstance
  listInventory: (characterId: string) => InventorySnapshot
  getEquipped: (characterId: string) => EquippedItemViews
  equip: (characterId: string, instanceId: string, slot: EquipmentSlot) => InventorySnapshot
  unequip: (characterId: string, target: string) => InventorySnapshot
  getItemInstance: (instanceId: string) => ItemInstance
  applyEnchantment: (instanceId: string, overlay: EnchantmentOverlay) => ItemInstance
  removeEnchantment: (instanceId: string, overlayId: string) => ItemInstance
  getWeaponDamageProfile: (instanceId: string) => WeaponDamageProfile
}

function requireId(value: string, label: string): string {
  if (!value.trim()) throw new Error(`${label} required`)
  return value
}

function cloneTemplate(template: ItemTemplate): ItemTemplate {
  const copy: ItemTemplate = { id: template.id, name: template.name }
  if (template.description !== undefined) copy.description = template.description
  if (template.equipmentSlots !== undefined) copy.equipmentSlots = [...template.equipmentSlots]
  if (template.tags !== undefined) copy.tags = [...template.tags]
  if (template.weaponDamage !== undefined) {
    copy.weaponDamage = template.weaponDamage.map((component) => ({ ...component }))
  }
  return copy
}

function cloneInstance(instance: ItemInstance): ItemInstance {
  const copy: ItemInstance = { id: instance.id, templateId: instance.templateId }
  if (instance.durability !== undefined) copy.durability = instance.durability
  if (instance.charges !== undefined) copy.charges = instance.charges
  if (instance.customName !== undefined) copy.customName = instance.customName
  if (instance.enchantmentOverlays !== undefined) {
    copy.enchantmentOverlays = listEnchantmentOverlays(instance)
  }
  return copy
}

function normalizeTemplate(template: ItemTemplate): ItemTemplate {
  requireId(template.id, 'Template id')
  requireId(template.name, 'Template name')
  const normalized = cloneTemplate(template)
  if (normalized.equipmentSlots?.length === 0) delete normalized.equipmentSlots
  if (normalized.tags?.length === 0) delete normalized.tags
  return normalized
}

function createInstance(id: string, templateId: string, state: ItemInstanceState = {}): ItemInstance {
  const instance: ItemInstance = { id, templateId }
  if (state.durability !== undefined) instance.durability = state.durability
  if (state.charges !== undefined) instance.charges = state.charges
  if (state.customName !== undefined) instance.customName = state.customName
  if (state.enchantmentOverlays !== undefined) {
    instance.enchantmentOverlays = listEnchantmentOverlays({ id, templateId, enchantmentOverlays: state.enchantmentOverlays })
  }
  return instance
}

function removeHeld(inventory: InventoryRecord, instanceId: string): void {
  inventory.heldItemIds = inventory.heldItemIds.filter((id) => id !== instanceId)
}

function findFixedSlot(equipped: EquippedItems, instanceId: string): FixedEquipmentSlot | null {
  for (const slot of ['mainHand', 'offHand', 'shield', 'armor'] as const) {
    if (equipped[slot] === instanceId) return slot
  }
  return null
}

function hasEquipped(inventory: InventoryRecord, instanceId: string): boolean {
  return findFixedSlot(inventory.equipped, instanceId) !== null || inventory.equipped.accessories.includes(instanceId)
}

class InMemoryItemService implements ItemService {
  private readonly templates = new Map<string, ItemTemplate>()
  private readonly inventories = new Map<string, InventoryRecord>()
  private readonly instances = new Map<string, ItemInstance>()
  private nextInstanceNumber = 1

  defineTemplate(template: ItemTemplate): ItemTemplate {
    const normalized = normalizeTemplate(template)
    if (this.templates.has(normalized.id)) throw new Error(`Template already exists: ${normalized.id}`)
    this.templates.set(normalized.id, normalized)
    return cloneTemplate(normalized)
  }

  getTemplate(templateId: string): ItemTemplate {
    const template = this.templates.get(templateId)
    if (!template) throw new Error(`Template not found: ${templateId}`)
    return cloneTemplate(template)
  }

  createInventory(characterId: string): InventorySnapshot {
    requireId(characterId, 'Character id')
    if (!this.inventories.has(characterId)) {
      this.inventories.set(characterId, { characterId, heldItemIds: [], equipped: createEmptyEquippedItems() })
    }
    return this.listInventory(characterId)
  }

  addItem(characterId: string, templateId: string, state?: ItemInstanceState): ItemInstance {
    const inventory = this.getInventory(characterId)
    this.getTemplate(templateId)
    const instance = createInstance(`item.${this.nextInstanceNumber.toString(36)}`, templateId, state)
    this.nextInstanceNumber += 1
    this.instances.set(instance.id, instance)
    inventory.heldItemIds.push(instance.id)
    return cloneInstance(instance)
  }

  listInventory(characterId: string): InventorySnapshot {
    const inventory = this.getInventory(characterId)
    return {
      characterId: inventory.characterId,
      held: inventory.heldItemIds.map((id) => this.getInstanceView(id)),
      equipped: this.getEquipped(characterId)
    }
  }

  getEquipped(characterId: string): EquippedItemViews {
    const equipped = this.getInventory(characterId).equipped
    const views: EquippedItemViews = {
      accessories: equipped.accessories.map((id) => this.getInstanceView(id))
    }
    for (const slot of ['mainHand', 'offHand', 'shield', 'armor'] as const) {
      const instanceId = equipped[slot]
      if (instanceId !== undefined) views[slot] = this.getInstanceView(instanceId)
    }
    return views
  }

  equip(characterId: string, instanceId: string, slot: EquipmentSlot): InventorySnapshot {
    const inventory = this.getInventory(characterId)
    const instance = this.requireHeldInstance(inventory, instanceId)
    const template = this.getTemplate(instance.templateId)
    if (!template.equipmentSlots?.includes(slot)) throw new Error(`Item not compatible with slot: ${slot}`)
    this.placeEquippedItem(inventory, instanceId, slot)
    return this.listInventory(characterId)
  }

  unequip(characterId: string, target: string): InventorySnapshot {
    const inventory = this.getInventory(characterId)
    if (target === 'accessories') this.unequipAccessories(inventory)
    else if (isFixedEquipmentSlot(target)) this.unequipFixedSlot(inventory, target)
    else this.unequipByInstance(inventory, target)
    return this.listInventory(characterId)
  }

  getItemInstance(instanceId: string): ItemInstance {
    return cloneInstance(this.requireInstance(instanceId))
  }

  applyEnchantment(instanceId: string, overlay: EnchantmentOverlay): ItemInstance {
    const instance = this.requireInstance(instanceId)
    const updated = applyEnchantmentOverlay(instance, overlay)
    this.instances.set(instanceId, updated)
    return cloneInstance(updated)
  }

  removeEnchantment(instanceId: string, overlayId: string): ItemInstance {
    const instance = this.requireInstance(instanceId)
    const updated = removeEnchantmentOverlay(instance, overlayId)
    this.instances.set(instanceId, updated)
    return cloneInstance(updated)
  }

  getWeaponDamageProfile(instanceId: string): WeaponDamageProfile {
    const instance = this.requireInstance(instanceId)
    return buildWeaponDamageProfile(this.getTemplate(instance.templateId), instance)
  }

  private requireInstance(instanceId: string): ItemInstance {
    const instance = this.instances.get(instanceId)
    if (!instance) throw new Error(`Item instance not found: ${instanceId}`)
    return instance
  }

  private getInventory(characterId: string): InventoryRecord {
    const inventory = this.inventories.get(characterId)
    if (!inventory) throw new Error(`Inventory not found: ${characterId}`)
    return inventory
  }

  private getInstanceView(instanceId: string): ItemView {
    const instance = this.instances.get(instanceId)
    if (!instance) throw new Error(`Item instance not found: ${instanceId}`)
    return { instance: cloneInstance(instance), template: this.getTemplate(instance.templateId) }
  }

  private requireHeldInstance(inventory: InventoryRecord, instanceId: string): ItemInstance {
    const instance = this.instances.get(instanceId)
    if (!instance) throw new Error(`Item instance not found: ${instanceId}`)
    if (inventory.heldItemIds.includes(instanceId)) return instance
    if (hasEquipped(inventory, instanceId)) throw new Error(`Item already equipped: ${instanceId}`)
    throw new Error(`Held item not found: ${instanceId}`)
  }

  private placeEquippedItem(inventory: InventoryRecord, instanceId: string, slot: EquipmentSlot): void {
    if (isFixedEquipmentSlot(slot)) {
      if (inventory.equipped[slot] !== undefined) throw new Error(`Slot occupied: ${slot}`)
      removeHeld(inventory, instanceId)
      inventory.equipped[slot] = instanceId
      return
    }
    removeHeld(inventory, instanceId)
    inventory.equipped.accessories.push(instanceId)
  }

  private unequipFixedSlot(inventory: InventoryRecord, slot: FixedEquipmentSlot): void {
    const instanceId = inventory.equipped[slot]
    if (instanceId === undefined) throw new Error(`Slot empty: ${slot}`)
    delete inventory.equipped[slot]
    inventory.heldItemIds.push(instanceId)
  }

  private unequipAccessories(inventory: InventoryRecord): void {
    if (inventory.equipped.accessories.length === 0) throw new Error('Slot empty: accessories')
    inventory.heldItemIds.push(...inventory.equipped.accessories)
    inventory.equipped.accessories = []
  }

  private unequipByInstance(inventory: InventoryRecord, instanceId: string): void {
    const fixedSlot = findFixedSlot(inventory.equipped, instanceId)
    if (fixedSlot !== null) return this.unequipFixedSlot(inventory, fixedSlot)
    const nextAccessories = inventory.equipped.accessories.filter((id) => id !== instanceId)
    if (nextAccessories.length === inventory.equipped.accessories.length) {
      throw new Error(`Equipped item not found: ${instanceId}`)
    }
    inventory.equipped.accessories = nextAccessories
    inventory.heldItemIds.push(instanceId)
  }
}

export function createItemService(): ItemService {
  return new InMemoryItemService()
}
