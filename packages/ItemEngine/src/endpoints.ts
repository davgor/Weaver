import type { EngineEndpoint } from './typesApi.js'
import { type ItemService } from './itemService.js'
import {
  isEquipmentSlot,
  type EquipmentSlot,
  type ItemInstanceState,
  type ItemTemplate
} from './types.js'

const PACKAGE_NAME = '@weaver/item-engine'
const VERSION = '0.1.0'

function asRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') throw new Error('payload object required')
  return payload as Record<string, unknown>
}

function requireString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} required`)
  return value
}

function optionalString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (typeof value !== 'string') throw new Error(`${key} must be a string`)
  return value
}

function optionalNumber(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(`${key} must be a number`)
  return value
}

function optionalStringArray(payload: Record<string, unknown>, key: string): string[] | undefined {
  const value = payload[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${key} must be a string array`)
  }
  return [...value]
}

function optionalSlots(payload: Record<string, unknown>): EquipmentSlot[] | undefined {
  const value = payload.equipmentSlots
  if (value === undefined) return undefined
  if (!Array.isArray(value)) throw new Error('equipmentSlots must be an array')
  const slots: EquipmentSlot[] = []
  for (const slot of value) {
    if (!isEquipmentSlot(slot)) throw new Error(`Unknown equipment slot: ${String(slot)}`)
    slots.push(slot)
  }
  return slots
}

function parseTemplate(payload: unknown): ItemTemplate {
  const body = asRecord(payload)
  const template: ItemTemplate = {
    id: requireString(body, 'id'),
    name: requireString(body, 'name')
  }
  const description = optionalString(body, 'description')
  if (description !== undefined) template.description = description
  const equipmentSlots = optionalSlots(body)
  if (equipmentSlots !== undefined) template.equipmentSlots = equipmentSlots
  const tags = optionalStringArray(body, 'tags')
  if (tags !== undefined) template.tags = tags
  return template
}

function parseInstanceState(payload: unknown): ItemInstanceState | undefined {
  if (payload === undefined) return undefined
  const body = asRecord(payload)
  const state: ItemInstanceState = {}
  const durability = optionalNumber(body, 'durability')
  if (durability !== undefined) state.durability = durability
  const charges = optionalNumber(body, 'charges')
  if (charges !== undefined) state.charges = charges
  const customName = optionalString(body, 'customName')
  if (customName !== undefined) state.customName = customName
  const enchantmentRefs = optionalStringArray(body, 'enchantmentRefs')
  if (enchantmentRefs !== undefined) state.enchantmentRefs = enchantmentRefs
  return state
}

function requireSlot(payload: Record<string, unknown>): EquipmentSlot {
  const slot = payload.slot
  if (!isEquipmentSlot(slot)) throw new Error('slot required')
  return slot
}

function requireTarget(payload: Record<string, unknown>): string {
  const target = payload.target ?? payload.slot ?? payload.instanceId
  if (typeof target !== 'string' || !target.trim()) throw new Error('target required')
  return target
}

function templateEndpoints(service: ItemService): EngineEndpoint[] {
  return [
    {
      name: 'defineTemplate',
      description: 'Register one item template definition',
      invoke: (payload) => service.defineTemplate(parseTemplate(payload))
    },
    {
      name: 'getTemplate',
      description: 'Return one item template definition',
      invoke: (payload) => service.getTemplate(requireString(asRecord(payload), 'templateId'))
    }
  ]
}

function inventoryEndpoints(service: ItemService): EngineEndpoint[] {
  return [
    {
      name: 'createInventory',
      description: 'Create or return a character inventory',
      invoke: (payload) => service.createInventory(requireString(asRecord(payload), 'characterId'))
    },
    {
      name: 'listInventory',
      description: 'List held and equipped item views for a character',
      invoke: (payload) => service.listInventory(requireString(asRecord(payload), 'characterId'))
    },
    {
      name: 'getEquipped',
      description: 'Return equipped item views for a character',
      invoke: (payload) => service.getEquipped(requireString(asRecord(payload), 'characterId'))
    }
  ]
}

function mutationEndpoints(service: ItemService): EngineEndpoint[] {
  return [
    {
      name: 'addItem',
      description: 'Create an item instance in a character inventory',
      invoke: (payload) => {
        const body = asRecord(payload)
        return service.addItem(
          requireString(body, 'characterId'),
          requireString(body, 'templateId'),
          parseInstanceState(body.instanceState)
        )
      }
    },
    {
      name: 'equip',
      description: 'Equip a held item instance into a compatible slot',
      invoke: (payload) => {
        const body = asRecord(payload)
        return service.equip(requireString(body, 'characterId'), requireString(body, 'instanceId'), requireSlot(body))
      }
    },
    {
      name: 'unequip',
      description: 'Unequip by slot name, target field, or instance id',
      invoke: (payload) => {
        const body = asRecord(payload)
        return service.unequip(requireString(body, 'characterId'), requireTarget(body))
      }
    }
  ]
}

export function buildEndpoints(service: ItemService): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    ...templateEndpoints(service),
    ...inventoryEndpoints(service),
    ...mutationEndpoints(service)
  ]
}
