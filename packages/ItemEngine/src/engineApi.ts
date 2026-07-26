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
const singletonService: ItemService = createItemService()
const singletonCurrency: CurrencyService = createCurrencyService()

export const itemEngine: ItemEngineApi = {
  id: 'ItemEngine',
  title: 'Item Engine',
  description: 'Create and modify game items',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints(singletonService, singletonCurrency)
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints(singletonService, singletonCurrency).find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  defineTemplate(template) {
    return singletonService.defineTemplate(template)
  },
  getTemplate(templateId) {
    return singletonService.getTemplate(templateId)
  },
  seedItemTemplateCatalog() {
    return seedItemTemplateCatalog(singletonService)
  },
  createInventory(characterId) {
    return singletonService.createInventory(characterId)
  },
  addItem(characterId, templateId, state) {
    return singletonService.addItem(characterId, templateId, state)
  },
  listInventory(characterId) {
    return singletonService.listInventory(characterId)
  },
  getEquipped(characterId) {
    return singletonService.getEquipped(characterId)
  },
  equip(characterId, instanceId, slot) {
    return singletonService.equip(characterId, instanceId, slot)
  },
  unequip(characterId, target) {
    return singletonService.unequip(characterId, target)
  },
  getItemInstance(instanceId) {
    return singletonService.getItemInstance(instanceId)
  },
  applyEnchantment(instanceId, overlay) {
    return singletonService.applyEnchantment(instanceId, overlay)
  },
  removeEnchantment(instanceId, overlayId) {
    return singletonService.removeEnchantment(instanceId, overlayId)
  },
  getWeaponDamageProfile(instanceId) {
    return singletonService.getWeaponDamageProfile(instanceId)
  },
  credit(characterId, amount) {
    return singletonCurrency.credit(characterId, amount)
  },
  debit(characterId, amount) {
    return singletonCurrency.debit(characterId, amount)
  },
  getBalance(characterId) {
    return singletonCurrency.getBalance(characterId)
  },
  clampProposedPrice(proposed, opts) {
    return clampProposedPrice(proposed, opts)
  },
  snapshotCampaignBalances(characterIds) {
    return singletonCurrency.snapshotBalances(characterIds)
  },
  restoreCampaignBalances(balances) {
    singletonCurrency.restoreBalances(balances)
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
