import type { Ability, AbilityScores } from '@weaver/character-engine'
import type {
  EquipmentSlot,
  EquippedItemViews,
  ItemView
} from '@weaver/item-engine'

export const CHARACTER_SHEET_TABS = [
  'stats',
  'equipment',
  'journal',
  'logBook',
  'quests',
  'spellbook'
] as const

export type CharacterSheetTab = (typeof CHARACTER_SHEET_TABS)[number]

export type AbilityRow = {
  ability: Ability
  score: number
  modifier: number
}

export type SheetJournalEntry = {
  id: string
  text: string
  createdAt: string
  linkedNpcId?: string
}

export type SheetLogBookEntry = {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export type SheetQuestEntry = {
  questId: string
  kind: 'main' | 'side'
  status: 'active' | 'complete' | 'failed'
  title?: string
}

export type CharacterSheetSnapshot = {
  characterId: string
  characterName: string
  abilityRows: AbilityRow[]
  maxHp: number
  currentHp: number
  armorClass: number
  armorBonus: number
  abilityScores: AbilityScores
  equipped: EquippedItemViews
  held: ItemView[]
  journal: SheetJournalEntry[]
  logBook: SheetLogBookEntry[]
  mainQuests: SheetQuestEntry[]
  sideQuests: SheetQuestEntry[]
  knownActionIds: string[]
}

export type LoadCharacterSheetRequest = {
  characterId: string
  characterName: string
  abilityScores: AbilityScores
  currentHp?: number
}

export type EquipItemRequest = {
  characterId: string
  instanceId: string
  slot: EquipmentSlot
}

export type UnequipItemRequest = {
  characterId: string
  target: string
}

export type CharacterSheetApi = {
  load: (request: LoadCharacterSheetRequest) => Promise<CharacterSheetSnapshot>
  equip: (request: EquipItemRequest) => Promise<CharacterSheetSnapshot>
  unequip: (request: UnequipItemRequest) => Promise<CharacterSheetSnapshot>
}
