export const EQUIPMENT_SLOTS = ['mainHand', 'offHand', 'shield', 'armor', 'accessories'] as const
export const FIXED_EQUIPMENT_SLOTS = ['mainHand', 'offHand', 'shield', 'armor'] as const

export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number]
export type FixedEquipmentSlot = (typeof FIXED_EQUIPMENT_SLOTS)[number]

export type ItemInstanceState = {
  durability?: number
  charges?: number
  customName?: string
  enchantmentRefs?: string[]
}

export type ItemTemplate = {
  id: string
  name: string
  description?: string
  equipmentSlots?: EquipmentSlot[]
  tags?: string[]
}

export type ItemInstance = {
  id: string
  templateId: string
  durability?: number
  charges?: number
  customName?: string
  enchantmentRefs?: string[]
}

export type EquippedItems = {
  mainHand?: string
  offHand?: string
  shield?: string
  armor?: string
  accessories: string[]
}

export type ItemView = {
  template: ItemTemplate
  instance: ItemInstance
}

export type EquippedItemViews = {
  mainHand?: ItemView
  offHand?: ItemView
  shield?: ItemView
  armor?: ItemView
  accessories: ItemView[]
}

export type InventorySnapshot = {
  characterId: string
  held: ItemView[]
  equipped: EquippedItemViews
}

export function createEmptyEquippedItems(): EquippedItems {
  return { accessories: [] }
}

export function isEquipmentSlot(value: unknown): value is EquipmentSlot {
  return typeof value === 'string' && EQUIPMENT_SLOTS.some((slot) => slot === value)
}

export function isFixedEquipmentSlot(value: unknown): value is FixedEquipmentSlot {
  return typeof value === 'string' && FIXED_EQUIPMENT_SLOTS.some((slot) => slot === value)
}
