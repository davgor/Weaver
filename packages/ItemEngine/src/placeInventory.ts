import type { LootDrop } from './lootService.js'

export type PlaceInventorySnapshot = {
  placeId: string
  drops: LootDrop[]
}

const placeInventories = new Map<string, LootDrop[]>()

export function clearPlaceInventories(): void {
  placeInventories.clear()
}

export function seedPlaceLoot(placeId: string, drops: readonly LootDrop[]): PlaceInventorySnapshot {
  assertPlaceId(placeId)
  const existing = placeInventories.get(placeId)
  if (existing !== undefined) return snapshot(placeId, existing)
  const seeded = drops.map(copyDrop)
  placeInventories.set(placeId, seeded)
  return snapshot(placeId, seeded)
}

export function listPlaceInventory(placeId: string): PlaceInventorySnapshot {
  assertPlaceId(placeId)
  return snapshot(placeId, placeInventories.get(placeId) ?? [])
}

function assertPlaceId(placeId: string): void {
  if (!placeId.trim()) throw new Error('placeId required')
}

function snapshot(placeId: string, drops: readonly LootDrop[]): PlaceInventorySnapshot {
  return { placeId, drops: drops.map(copyDrop) }
}

function copyDrop(drop: LootDrop): LootDrop {
  return { templateId: drop.templateId, quantity: drop.quantity }
}
