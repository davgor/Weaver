import {
  FIXED_EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type EquippedItemViews,
  type FixedEquipmentSlot,
  type ItemView
} from '@weaver/item-engine'

const SLOT_LABELS: Record<EquipmentSlot, string> = {
  mainHand: 'Main Hand',
  offHand: 'Off Hand',
  shield: 'Shield',
  armor: 'Armor',
  accessories: 'Accessories'
}

export type FixedSlotEntry = {
  slot: FixedEquipmentSlot
  label: string
  item: ItemView | undefined
}

export function equipmentSlotLabel(slot: EquipmentSlot): string {
  return SLOT_LABELS[slot]
}

export function listFixedSlotEntries(equipped: EquippedItemViews): FixedSlotEntry[] {
  return FIXED_EQUIPMENT_SLOTS.map((slot) => ({
    slot,
    label: SLOT_LABELS[slot],
    item: equipped[slot]
  }))
}

export function compatibleEquipSlots(item: ItemView): EquipmentSlot[] {
  return item.template.equipmentSlots === undefined ? [] : [...item.template.equipmentSlots]
}
