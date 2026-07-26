import { buildEndpoints } from './endpoints.js'
import { createItemService, type ItemService } from './itemService.js'
import type {
  EquipmentSlot,
  EquippedItemViews,
  InventorySnapshot,
  ItemInstance,
  ItemInstanceState,
  ItemTemplate
} from './types.js'

export type ItemEngineApi = {
  id: 'ItemEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => ReturnType<typeof buildEndpoints>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
  defineTemplate: (template: ItemTemplate) => ItemTemplate
  getTemplate: (templateId: string) => ItemTemplate
  createInventory: (characterId: string) => InventorySnapshot
  addItem: (characterId: string, templateId: string, state?: ItemInstanceState) => ItemInstance
  listInventory: (characterId: string) => InventorySnapshot
  getEquipped: (characterId: string) => EquippedItemViews
  equip: (characterId: string, instanceId: string, slot: EquipmentSlot) => InventorySnapshot
  unequip: (characterId: string, target: string) => InventorySnapshot
}

const PACKAGE_NAME = '@weaver/item-engine'
const VERSION = '0.1.0'
const singletonService: ItemService = createItemService()

export const itemEngine: ItemEngineApi = {
  id: 'ItemEngine',
  title: 'Item Engine',
  description: 'Create and modify game items',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints(singletonService)
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints(singletonService).find((entry) => entry.name === endpoint)
    if (!match) throw new Error(`Unknown endpoint: ${endpoint}`)
    return await match.invoke(payload)
  },
  defineTemplate(template) {
    return singletonService.defineTemplate(template)
  },
  getTemplate(templateId) {
    return singletonService.getTemplate(templateId)
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
  }
}
