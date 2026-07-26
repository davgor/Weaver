export type { EngineEndpoint } from './typesApi.js'
export {
  EQUIPMENT_SLOTS,
  FIXED_EQUIPMENT_SLOTS,
  createEmptyEquippedItems,
  isEquipmentSlot,
  isFixedEquipmentSlot
} from './types.js'
export type {
  EquipmentSlot,
  EquippedItems,
  EquippedItemViews,
  FixedEquipmentSlot,
  InventorySnapshot,
  ItemInstance,
  ItemInstanceState,
  ItemTemplate,
  ItemView
} from './types.js'
export { createItemService } from './itemService.js'
export type { ItemService } from './itemService.js'
export { itemEngine } from './engineApi.js'
export type { ItemEngineApi } from './engineApi.js'
