import {
  createCurrencyService,
  createItemService,
  type CurrencyBalanceSnapshot,
  type CurrencyService,
  type EnchantmentOverlay,
  type EquipmentSlot,
  type EquippedItems,
  type InventorySnapshot,
  type ItemInstance,
  type ItemInstanceState,
  type ItemService,
  type ItemTemplate,
  type WeaponDamageProfile
} from '@weaver/item-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

type TemplateRow = { id: string; payload_json: string }
type InstanceRow = {
  id: string
  template_id: string
  owner_character_id: string
  payload_json: string
}
type InventoryRow = { character_id: string; held_json: string; equipped_json: string }
type CurrencyRow = { character_id: string; balance: number }
type MetaRow = { key: string; value: string }
type StoredInventory = {
  characterId: string
  heldItemIds: string[]
  equipped: EquippedItems
}

export function createSqliteItemService(db: SqliteDatabase): ItemService {
  return new SqliteItemService(db, createItemService(readItemSeed(db)))
}

export function createSqliteCurrencyService(db: SqliteDatabase): CurrencyService {
  const memory = createCurrencyService()
  memory.restoreBalances(readBalances(db))
  return new SqliteCurrencyService(db, memory)
}

class SqliteItemService implements ItemService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly memory: ItemService
  ) {}

  defineTemplate(template: ItemTemplate): ItemTemplate {
    const stored = this.memory.defineTemplate(template)
    persistTemplate(this.db, stored)
    return stored
  }

  getTemplate(templateId: string): ItemTemplate {
    return this.memory.getTemplate(templateId)
  }

  createInventory(characterId: string): InventorySnapshot {
    const snapshot = this.memory.createInventory(characterId)
    persistInventory(this.db, snapshot)
    return snapshot
  }

  addItem(characterId: string, templateId: string, state?: ItemInstanceState): ItemInstance {
    const item = this.memory.addItem(characterId, templateId, state)
    persistInstance(this.db, item, characterId)
    persistInventory(this.db, this.memory.listInventory(characterId))
    persistNextInstanceNumber(this.db, item.id)
    return item
  }

  listInventory(characterId: string): InventorySnapshot {
    return this.memory.listInventory(characterId)
  }

  getEquipped(characterId: string) {
    return this.memory.getEquipped(characterId)
  }

  equip(characterId: string, instanceId: string, slot: EquipmentSlot): InventorySnapshot {
    const snapshot = this.memory.equip(characterId, instanceId, slot)
    persistInventory(this.db, snapshot)
    return snapshot
  }

  unequip(characterId: string, target: string): InventorySnapshot {
    const snapshot = this.memory.unequip(characterId, target)
    persistInventory(this.db, snapshot)
    return snapshot
  }

  transferItem(fromCharacterId: string, toCharacterId: string, instanceId: string): InventorySnapshot {
    const snapshot = this.memory.transferItem(fromCharacterId, toCharacterId, instanceId)
    persistInventory(this.db, this.memory.listInventory(fromCharacterId))
    persistInventory(this.db, snapshot)
    updateInstanceOwner(this.db, instanceId, toCharacterId)
    return snapshot
  }

  getItemInstance(instanceId: string): ItemInstance {
    return this.memory.getItemInstance(instanceId)
  }

  applyEnchantment(instanceId: string, overlay: EnchantmentOverlay): ItemInstance {
    const item = this.memory.applyEnchantment(instanceId, overlay)
    updateInstancePayload(this.db, item)
    return item
  }

  removeEnchantment(instanceId: string, overlayId: string): ItemInstance {
    const item = this.memory.removeEnchantment(instanceId, overlayId)
    updateInstancePayload(this.db, item)
    return item
  }

  getWeaponDamageProfile(instanceId: string): WeaponDamageProfile {
    return this.memory.getWeaponDamageProfile(instanceId)
  }
}

class SqliteCurrencyService implements CurrencyService {
  constructor(
    private readonly db: SqliteDatabase,
    private readonly memory: CurrencyService
  ) {}

  credit(characterId: string, amount: number): CurrencyBalanceSnapshot {
    const snapshot = this.memory.credit(characterId, amount)
    persistBalance(this.db, snapshot)
    return snapshot
  }

  debit(characterId: string, amount: number): CurrencyBalanceSnapshot {
    const snapshot = this.memory.debit(characterId, amount)
    persistBalance(this.db, snapshot)
    return snapshot
  }

  getBalance(characterId: string): number {
    return this.memory.getBalance(characterId)
  }

  snapshotBalances(characterIds: readonly string[]): Record<string, number> {
    return this.memory.snapshotBalances(characterIds)
  }

  restoreBalances(balances: Record<string, number>): void {
    this.memory.restoreBalances(balances)
    for (const [characterId, balance] of Object.entries(balances)) {
      persistBalance(this.db, { characterId, balance })
    }
  }
}

function readItemSeed(db: SqliteDatabase) {
  const templates = readTemplates(db)
  const instances = readInstances(db)
  return {
    templates,
    instances,
    inventories: readInventories(db),
    nextInstanceNumber: readNextInstanceNumber(db, instances)
  }
}

function readTemplates(db: SqliteDatabase): ItemTemplate[] {
  const rows = db.prepare('SELECT id, payload_json FROM item_templates ORDER BY id').all() as TemplateRow[]
  return rows.map((row) => JSON.parse(row.payload_json) as ItemTemplate)
}

function readInstances(db: SqliteDatabase): ItemInstance[] {
  const rows = db
    .prepare('SELECT id, template_id, owner_character_id, payload_json FROM item_instances ORDER BY id')
    .all() as InstanceRow[]
  return rows.map(toItemInstance)
}

function readInventories(db: SqliteDatabase): StoredInventory[] {
  const rows = db
    .prepare('SELECT character_id, held_json, equipped_json FROM character_inventories ORDER BY character_id')
    .all() as InventoryRow[]
  return rows.map((row) => ({
    characterId: row.character_id,
    heldItemIds: parseStringArray(row.held_json),
    equipped: parseEquipped(row.equipped_json)
  }))
}

function readBalances(db: SqliteDatabase): Record<string, number> {
  const rows = db
    .prepare('SELECT character_id, balance FROM character_currency ORDER BY character_id')
    .all() as CurrencyRow[]
  return Object.fromEntries(rows.map((row) => [row.character_id, row.balance]))
}

function readNextInstanceNumber(db: SqliteDatabase, instances: readonly ItemInstance[]): number {
  const row = db.prepare("SELECT key, value FROM item_store_meta WHERE key = 'next_instance_number'").get() as
    | MetaRow
    | undefined
  const fromMeta = row === undefined ? undefined : Number(row.value)
  if (fromMeta !== undefined && Number.isInteger(fromMeta) && fromMeta > 0) return fromMeta
  return inferNextInstanceNumber(instances)
}

function inferNextInstanceNumber(instances: readonly ItemInstance[]): number {
  let next = 1
  for (const instance of instances) {
    const parsed = parseGeneratedItemNumber(instance.id)
    if (parsed !== undefined && parsed >= next) next = parsed + 1
  }
  return next
}

function toItemInstance(row: InstanceRow): ItemInstance {
  const parsed = JSON.parse(row.payload_json) as ItemInstance
  return { ...parsed, id: row.id, templateId: row.template_id }
}

function persistTemplate(db: SqliteDatabase, template: ItemTemplate): void {
  db.prepare(
    `INSERT INTO item_templates (id, payload_json)
     VALUES (?, ?)
     ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json`
  ).run(template.id, JSON.stringify(template))
}

function persistInstance(db: SqliteDatabase, item: ItemInstance, ownerCharacterId: string): void {
  db.prepare(
    `INSERT INTO item_instances (id, template_id, owner_character_id, payload_json)
     VALUES (?, ?, ?, ?)`
  ).run(item.id, item.templateId, ownerCharacterId, JSON.stringify(item))
}

function updateInstanceOwner(db: SqliteDatabase, instanceId: string, ownerCharacterId: string): void {
  db.prepare('UPDATE item_instances SET owner_character_id = ? WHERE id = ?').run(ownerCharacterId, instanceId)
}

function updateInstancePayload(db: SqliteDatabase, item: ItemInstance): void {
  db.prepare('UPDATE item_instances SET payload_json = ? WHERE id = ?').run(JSON.stringify(item), item.id)
}

function persistInventory(db: SqliteDatabase, snapshot: InventorySnapshot): void {
  const stored = toInventorySeed(snapshot)
  db.prepare(
    `INSERT INTO character_inventories (character_id, held_json, equipped_json)
     VALUES (?, ?, ?)
     ON CONFLICT(character_id) DO UPDATE SET
       held_json = excluded.held_json,
       equipped_json = excluded.equipped_json`
  ).run(stored.characterId, JSON.stringify(stored.heldItemIds), JSON.stringify(stored.equipped))
}

function persistBalance(db: SqliteDatabase, snapshot: CurrencyBalanceSnapshot): void {
  db.prepare(
    `INSERT INTO character_currency (character_id, balance)
     VALUES (?, ?)
     ON CONFLICT(character_id) DO UPDATE SET balance = excluded.balance`
  ).run(snapshot.characterId, snapshot.balance)
}

function persistNextInstanceNumber(db: SqliteDatabase, instanceId: string): void {
  const parsed = parseGeneratedItemNumber(instanceId)
  if (parsed === undefined) return
  writeItemMeta(db, 'next_instance_number', String(parsed + 1))
}

function writeItemMeta(db: SqliteDatabase, key: string, value: string): void {
  db.prepare(
    `INSERT INTO item_store_meta (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

function toInventorySeed(snapshot: InventorySnapshot): StoredInventory {
  return {
    characterId: snapshot.characterId,
    heldItemIds: snapshot.held.map((item) => item.instance.id),
    equipped: toEquippedIds(snapshot)
  }
}

function toEquippedIds(snapshot: InventorySnapshot): EquippedItems {
  const equipped: EquippedItems = {
    accessories: snapshot.equipped.accessories.map((item) => item.instance.id)
  }
  for (const slot of ['mainHand', 'offHand', 'shield', 'armor'] as const) {
    const item = snapshot.equipped[slot]
    if (item !== undefined) equipped[slot] = item.instance.id
  }
  return equipped
}

function parseStringArray(json: string): string[] {
  const parsed = JSON.parse(json) as unknown
  if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
    throw new Error('Expected JSON string array')
  }
  return [...parsed] as string[]
}

function parseEquipped(json: string): EquippedItems {
  const parsed = JSON.parse(json) as unknown
  if (!isRecord(parsed)) throw new Error('Expected equipped item object')
  return readEquippedRecord(parsed)
}

function readEquippedRecord(record: Record<string, unknown>): EquippedItems {
  const accessories = record.accessories
  if (!Array.isArray(accessories) || accessories.some((value) => typeof value !== 'string')) {
    throw new Error('Expected accessory id array')
  }
  const equipped: EquippedItems = { accessories: [...accessories] as string[] }
  for (const slot of ['mainHand', 'offHand', 'shield', 'armor'] as const) {
    const value = record[slot]
    if (value !== undefined && typeof value !== 'string') throw new Error(`Expected ${slot} item id`)
    if (typeof value === 'string') equipped[slot] = value
  }
  return equipped
}

function parseGeneratedItemNumber(instanceId: string): number | undefined {
  if (!instanceId.startsWith('item.')) return undefined
  const parsed = Number.parseInt(instanceId.slice('item.'.length), 36)
  return Number.isFinite(parsed) ? parsed : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
