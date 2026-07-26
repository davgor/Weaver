import type { AbilityScores } from '@weaver/character-engine'
import type { EquipmentSlot, InventorySnapshot } from '@weaver/item-engine'
import { buildAbilityRows } from '../../shared/characterSheet/abilityRows.js'
import { estimateArmorBonus } from '../../shared/characterSheet/armorBonus.js'
import { partitionQuestLog } from '../../shared/characterSheet/questPartition.js'
import type {
  CharacterSheetSnapshot,
  LoadCharacterSheetRequest,
  SheetJournalEntry,
  SheetLogBookEntry,
  SheetQuestEntry
} from '../../shared/characterSheet/types.js'

export type CharacterSheetPorts = {
  getAbilityModifier: (score: number) => number
  calculateArmorClass: (input: { agilityScore: number; armorBonus: number }) => number
  getCharacterStats: (characterId: string) => { characterId: string; maxHp: number } | undefined
  listJournalEntries: (characterId: string) => SheetJournalEntry[]
  listLogBookEntries: (characterId: string) => SheetLogBookEntry[]
  listQuestLog: (characterId: string) => SheetQuestEntry[]
  listKnownActions: (characterId: string) => string[]
  listInventory: (characterId: string) => InventorySnapshot
  equip: (characterId: string, instanceId: string, slot: EquipmentSlot) => InventorySnapshot
  unequip: (characterId: string, target: string) => InventorySnapshot
}

export function buildCharacterSheetSnapshot(
  ports: CharacterSheetPorts,
  request: LoadCharacterSheetRequest
): CharacterSheetSnapshot {
  const inventory = ports.listInventory(request.characterId)
  const armorBonus = estimateArmorBonus(inventory.equipped)
  const stats = ports.getCharacterStats(request.characterId)
  const maxHp = stats?.maxHp ?? 0
  const quests = partitionQuestLog(ports.listQuestLog(request.characterId))
  return {
    characterId: request.characterId,
    characterName: request.characterName,
    abilityScores: copyScores(request.abilityScores),
    abilityRows: buildAbilityRows(request.abilityScores, ports.getAbilityModifier),
    maxHp,
    currentHp: request.currentHp ?? maxHp,
    armorBonus,
    armorClass: ports.calculateArmorClass({
      agilityScore: request.abilityScores.Agility,
      armorBonus
    }),
    equipped: inventory.equipped,
    held: inventory.held,
    journal: ports.listJournalEntries(request.characterId),
    logBook: ports.listLogBookEntries(request.characterId),
    mainQuests: quests.mainQuests,
    sideQuests: quests.sideQuests,
    knownActionIds: ports.listKnownActions(request.characterId)
  }
}

export function equipAndReload(
  ports: CharacterSheetPorts,
  request: LoadCharacterSheetRequest,
  instanceId: string,
  slot: EquipmentSlot
): CharacterSheetSnapshot {
  ports.equip(request.characterId, instanceId, slot)
  return buildCharacterSheetSnapshot(ports, request)
}

export function unequipAndReload(
  ports: CharacterSheetPorts,
  request: LoadCharacterSheetRequest,
  target: string
): CharacterSheetSnapshot {
  ports.unequip(request.characterId, target)
  return buildCharacterSheetSnapshot(ports, request)
}

export function createEnginePorts(deps: {
  getAbilityModifier: CharacterSheetPorts['getAbilityModifier']
  calculateArmorClass: CharacterSheetPorts['calculateArmorClass']
  getCharacterStats: CharacterSheetPorts['getCharacterStats']
  listJournalEntries: CharacterSheetPorts['listJournalEntries']
  listLogBookEntries: CharacterSheetPorts['listLogBookEntries']
  listQuestLog: CharacterSheetPorts['listQuestLog']
  listKnownActions: CharacterSheetPorts['listKnownActions']
  listInventory: CharacterSheetPorts['listInventory']
  equip: CharacterSheetPorts['equip']
  unequip: CharacterSheetPorts['unequip']
}): CharacterSheetPorts {
  return { ...deps }
}

function copyScores(scores: AbilityScores): AbilityScores {
  return {
    Body: scores.Body,
    Agility: scores.Agility,
    Mind: scores.Mind,
    Presence: scores.Presence
  }
}
