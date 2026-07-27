export type { EngineEndpoint } from './typesApi.js'
export {
  applyEnchantmentOverlay,
  listEnchantmentOverlays,
  removeEnchantmentOverlay
} from './enchantmentModifications.js'
export {
  WEAPON_DAMAGE_TYPES,
  isWeaponDamageType
} from './enchantmentTypes.js'
export type {
  EnchantmentDamageOverlay,
  EnchantmentOnHitOverlay,
  EnchantmentOverlay,
  WeaponDamageComponent,
  WeaponDamageProfile,
  WeaponDamageType
} from './enchantmentTypes.js'
export {
  CurrencyError,
  InsufficientFundsError,
  InvalidCurrencyAmountError,
  InvalidPriceBoundsError,
  clampProposedPrice,
  createCurrencyService
} from './currencyService.js'
export {
  DEFAULT_LOOT_TABLE_ID,
  LOOT_TABLES,
  generateLoot
} from './lootService.js'
export {
  clearPlaceInventories,
  listPlaceInventory,
  seedPlaceLoot
} from './placeInventory.js'
export {
  EXPECTED_ACTION_ENGINE_ACTION_IDS,
  STARTING_GEAR_ARCHETYPES,
  STARTING_GEAR_CATALOG_VERSION,
  getStartingLoadout,
  isStartingGearArchetype
} from './startingGear.js'
export {
  ITEM_TEMPLATE_CATALOG_VERSION,
  TEMPLATE_IDS,
  getItemTemplateCatalog,
  seedItemTemplateCatalog
} from './templateCatalog.js'
export {
  EQUIPMENT_SLOTS,
  FIXED_EQUIPMENT_SLOTS,
  createEmptyEquippedItems,
  isEquipmentSlot,
  isFixedEquipmentSlot
} from './types.js'
export type {
  CurrencyBalanceSnapshot,
  CurrencyErrorCode,
  CurrencyService,
  PriceClampOptions
} from './currencyService.js'
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
export type {
  GenerateLootRequest,
  LootDifficulty,
  LootDrop,
  LootTable
} from './lootService.js'
export type { PlaceInventorySnapshot } from './placeInventory.js'
export type {
  StarterActionId,
  StartingGearArchetype,
  StartingLoadout,
  StartingLoadoutItem
} from './startingGear.js'
export type { StarterItemTemplateId } from './templateCatalog.js'
export { createItemService } from './itemService.js'
export type { ItemService } from './itemService.js'
export {
  buildWeaponDamageProfile,
  resolveWeaponDamageAgainstTarget
} from './weaponDamage.js'
export type {
  DamageModifierFn,
  DamageModifierInput,
  ResolvedWeaponDamage
} from './weaponDamage.js'
export {
  bindItemCampaignStores,
  isItemCampaignStoreBound,
  itemEngine,
  unbindItemCampaignStores
} from './engineApi.js'
export type { ItemEngineApi } from './engineApi.js'
export {
  exportCampaignSlice as exportItemCampaignSlice,
  importCampaignSlice as importItemCampaignSlice,
  ITEM_SLICE_VERSION,
  ItemPortabilitySchemaError,
  type ItemCampaignSlice,
  type ItemPortabilityContext
} from './portability/index.js'
