import { TEMPLATE_IDS, type StarterItemTemplateId } from './templateCatalog.js'

export const DEFAULT_LOOT_TABLE_ID = 'loot.default'

export type LootDifficulty = 'easy' | 'standard' | 'hard' | 'boss' | (string & {})

export type GenerateLootRequest = {
  seed: string
  difficulty?: LootDifficulty
  tag?: string
  tableId?: string
}

export type LootDrop = {
  templateId: StarterItemTemplateId
  quantity: number
}

type LootTableEntry = {
  templateId: StarterItemTemplateId
  weight: number
  minQuantity: number
  maxQuantity: number
  tags: readonly string[]
}

export type LootTable = {
  id: string
  entries: readonly LootTableEntry[]
}

export const LOOT_TABLES = [
  {
    id: DEFAULT_LOOT_TABLE_ID,
    entries: [
      { templateId: TEMPLATE_IDS.healingPotion, weight: 30, minQuantity: 1, maxQuantity: 2, tags: ['consumable'] },
      { templateId: TEMPLATE_IDS.antidoteVial, weight: 15, minQuantity: 1, maxQuantity: 1, tags: ['consumable'] },
      { templateId: TEMPLATE_IDS.silverLocket, weight: 15, minQuantity: 1, maxQuantity: 1, tags: ['trinket'] },
      { templateId: TEMPLATE_IDS.carvedBoneTrinket, weight: 20, minQuantity: 1, maxQuantity: 1, tags: ['trinket'] },
      { templateId: TEMPLATE_IDS.ropeBundle, weight: 10, minQuantity: 1, maxQuantity: 1, tags: ['gear'] },
      { templateId: TEMPLATE_IDS.travelerCloak, weight: 10, minQuantity: 1, maxQuantity: 1, tags: ['gear'] }
    ]
  },
  {
    id: 'loot.armory',
    entries: [
      { templateId: TEMPLATE_IDS.shortSword, weight: 25, minQuantity: 1, maxQuantity: 1, tags: ['weapon'] },
      { templateId: TEMPLATE_IDS.dagger, weight: 25, minQuantity: 1, maxQuantity: 2, tags: ['weapon'] },
      { templateId: TEMPLATE_IDS.roundShield, weight: 15, minQuantity: 1, maxQuantity: 1, tags: ['shield'] },
      { templateId: TEMPLATE_IDS.leatherArmor, weight: 15, minQuantity: 1, maxQuantity: 1, tags: ['armor'] },
      { templateId: TEMPLATE_IDS.chainShirt, weight: 10, minQuantity: 1, maxQuantity: 1, tags: ['armor'] },
      { templateId: TEMPLATE_IDS.healingPotion, weight: 10, minQuantity: 1, maxQuantity: 1, tags: ['consumable'] }
    ]
  }
] as const satisfies readonly LootTable[]

type RandomSource = {
  next: () => number
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261
  for (const char of seed) {
    hash ^= char.charCodeAt(0)
    hash = Math.imul(hash, 16_777_619)
  }
  return hash >>> 0
}

function createRandom(seed: string): RandomSource {
  let state = hashSeed(seed)
  return {
    next() {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
      return state / 4_294_967_296
    }
  }
}

function rollCount(difficulty?: LootDifficulty): number {
  if (difficulty === 'easy') return 1
  if (difficulty === 'hard') return 3
  if (difficulty === 'boss') return 4
  return 2
}

function resolveTable(tableId?: string): LootTable {
  const id = tableId ?? DEFAULT_LOOT_TABLE_ID
  const table = LOOT_TABLES.find((entry) => entry.id === id)
  if (!table) throw new Error(`Loot table not found: ${id}`)
  return table
}

function filterEntries(table: LootTable, tag?: string): readonly LootTableEntry[] {
  if (tag === undefined) return table.entries
  const entries = table.entries.filter((entry) => entry.tags.includes(tag))
  if (entries.length === 0) throw new Error(`Loot table has no entries for tag: ${tag}`)
  return entries
}

function randomInt(random: RandomSource, min: number, max: number): number {
  return min + Math.floor(random.next() * (max - min + 1))
}

function pickEntry(random: RandomSource, entries: readonly LootTableEntry[]): LootTableEntry {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let roll = random.next() * totalWeight
  for (const entry of entries) {
    roll -= entry.weight
    if (roll < 0) return entry
  }
  return entries[entries.length - 1] as LootTableEntry
}

function addDrop(drops: Map<StarterItemTemplateId, number>, entry: LootTableEntry, random: RandomSource): void {
  const quantity = randomInt(random, entry.minQuantity, entry.maxQuantity)
  drops.set(entry.templateId, (drops.get(entry.templateId) ?? 0) + quantity)
}

export function generateLoot(request: GenerateLootRequest): LootDrop[] {
  if (!request.seed.trim()) throw new Error('Loot seed required')
  const entries = filterEntries(resolveTable(request.tableId), request.tag)
  const random = createRandom(`${request.tableId ?? DEFAULT_LOOT_TABLE_ID}:${request.difficulty ?? 'standard'}:${request.seed}`)
  const drops = new Map<StarterItemTemplateId, number>()

  for (let roll = 0; roll < rollCount(request.difficulty); roll += 1) addDrop(drops, pickEntry(random, entries), random)

  return Array.from(drops.entries()).map(([templateId, quantity]) => ({ templateId, quantity }))
}
