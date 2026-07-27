import { buildEndpoints } from './endpoints.js'
import {
  clampProposedPrice,
  createCurrencyService,
  type CurrencyBalanceSnapshot,
  type CurrencyService,
  type PriceClampOptions
} from './currencyService.js'
import type { EnchantmentOverlay } from './enchantmentTypes.js'
import { createItemService, type ItemService } from './itemService.js'
import { generateLoot, type GenerateLootRequest, type LootDrop } from './lootService.js'
import {
  listPlaceInventory,
  seedPlaceLoot,
  type PlaceInventorySnapshot
} from './placeInventory.js'
import {
  getStartingLoadout,
  type StartingGearArchetype,
  type StartingLoadout
} from './startingGear.js'
import { seedItemTemplateCatalog } from './templateCatalog.js'
import type {
  EquipmentSlot,
  EquippedItemViews,
  InventorySnapshot,
  ItemInstance,
  ItemInstanceState,
  ItemTemplate
} from './types.js'
import type { WeaponDamageProfile } from './enchantmentTypes.js'

export type ItemEngineApi = {
  id: 'ItemEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  defineTemplate: (template: ItemTemplate) => ItemTemplate
  getTemplate: (templateId: string) => ItemTemplate
  seedItemTemplateCatalog: () => ItemTemplate[]
  createInventory: (characterId: string) => InventorySnapshot
  addItem: (characterId: string, templateId: string, state?: ItemInstanceState) => ItemInstance
  listInventory: (characterId: string) => InventorySnapshot
  getEquipped: (characterId: string) => EquippedItemViews
  equip: (characterId: string, instanceId: string, slot: EquipmentSlot) => InventorySnapshot
  unequip: (characterId: string, target: string) => InventorySnapshot
  transferItem: (fromCharacterId: string, toCharacterId: string, instanceId: string) => InventorySnapshot
  getItemInstance: (instanceId: string) => ItemInstance
  applyEnchantment: (instanceId: string, overlay: EnchantmentOverlay) => ItemInstance
  removeEnchantment: (instanceId: string, overlayId: string) => ItemInstance
  getWeaponDamageProfile: (instanceId: string) => WeaponDamageProfile
  credit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  debit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  getBalance: (characterId: string) => number
  clampProposedPrice: (proposed: number, opts?: PriceClampOptions) => number
  snapshotCampaignBalances: (characterIds: readonly string[]) => Record<string, number>
  restoreCampaignBalances: (balances: Record<string, number>) => void
  generateLoot: (request: GenerateLootRequest) => LootDrop[]
  seedPlaceLoot: (placeId: string, drops: readonly LootDrop[]) => PlaceInventorySnapshot
  listPlaceInventory: (placeId: string) => PlaceInventorySnapshot
  getStartingLoadout: (archetype: StartingGearArchetype) => StartingLoadout
}

const PACKAGE_NAME = '@weaver/item-engine'
const VERSION = '0.1.0'

export type ItemCampaignStores = {
  itemService: ItemService
  currencyService: CurrencyService
}

let activeItemService: ItemService = createItemService()
let activeCurrencyService: CurrencyService = createCurrencyService()
let campaignStoreBound = false

export function bindItemCampaignStores(stores: ItemCampaignStores): void {
  activeItemService = stores.itemService
  activeCurrencyService = stores.currencyService
  campaignStoreBound = true
}

export function unbindItemCampaignStores(): void {
  activeItemService = createItemService()
  activeCurrencyService = createCurrencyService()
  campaignStoreBound = false
}

export function isItemCampaignStoreBound(): boolean {
  return campaignStoreBound
}

export const itemEngine: ItemEngineApi = {
  id: 'ItemEngine',
  title: 'Item Engine',
  description: 'Create and modify game items',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints(activeItemService, activeCurrencyService)
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints(activeItemService, activeCurrencyService).find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  defineTemplate(template) {
    return activeItemService.defineTemplate(template)
  },
  getTemplate(templateId) {
    return activeItemService.getTemplate(templateId)
  },
  seedItemTemplateCatalog() {
    return seedItemTemplateCatalog(activeItemService)
  },
  createInventory(characterId) {
    return activeItemService.createInventory(characterId)
  },
  addItem(characterId, templateId, state) {
    return activeItemService.addItem(characterId, templateId, state)
  },
  listInventory(characterId) {
    return activeItemService.listInventory(characterId)
  },
  getEquipped(characterId) {
    return activeItemService.getEquipped(characterId)
  },
  equip(characterId, instanceId, slot) {
    return activeItemService.equip(characterId, instanceId, slot)
  },
  unequip(characterId, target) {
    return activeItemService.unequip(characterId, target)
  },
  transferItem(fromCharacterId, toCharacterId, instanceId) {
    return activeItemService.transferItem(fromCharacterId, toCharacterId, instanceId)
  },
  getItemInstance(instanceId) {
    return activeItemService.getItemInstance(instanceId)
  },
  applyEnchantment(instanceId, overlay) {
    return activeItemService.applyEnchantment(instanceId, overlay)
  },
  removeEnchantment(instanceId, overlayId) {
    return activeItemService.removeEnchantment(instanceId, overlayId)
  },
  getWeaponDamageProfile(instanceId) {
    return activeItemService.getWeaponDamageProfile(instanceId)
  },
  credit(characterId, amount) {
    return activeCurrencyService.credit(characterId, amount)
  },
  debit(characterId, amount) {
    return activeCurrencyService.debit(characterId, amount)
  },
  getBalance(characterId) {
    return activeCurrencyService.getBalance(characterId)
  },
  clampProposedPrice(proposed, opts) {
    return clampProposedPrice(proposed, opts)
  },
  snapshotCampaignBalances(characterIds) {
    return activeCurrencyService.snapshotBalances(characterIds)
  },
  restoreCampaignBalances(balances) {
    activeCurrencyService.restoreBalances(balances)
  },
  generateLoot(request) {
    return generateLoot(request)
  },
  seedPlaceLoot(placeId, drops) {
    return seedPlaceLoot(placeId, drops)
  },
  listPlaceInventory(placeId) {
    return listPlaceInventory(placeId)
  },
  getStartingLoadout(archetype) {
    return getStartingLoadout(archetype)
  }
}
