import {
  calculateArmorClass,
  getAbilityModifier,
  getCharacterStats,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog
} from '@weaver/character-engine'
import { itemEngine } from '@weaver/item-engine'
import type {
  CharacterSheetSnapshot,
  EquipItemRequest,
  LoadCharacterSheetRequest,
  UnequipItemRequest
} from '../../shared/characterSheet/types.js'
import { ensureDemoCharacterSheetData } from './demoSeed.js'
import {
  buildCharacterSheetSnapshot,
  createEnginePorts,
  equipAndReload,
  unequipAndReload,
  type CharacterSheetPorts
} from './loadSheet.js'

export type { CharacterSheetPorts }

let activeRequest: LoadCharacterSheetRequest | null = null

export function createLiveCharacterSheetPorts(): CharacterSheetPorts {
  return createEnginePorts({
    getAbilityModifier,
    calculateArmorClass,
    getCharacterStats,
    listJournalEntries,
    listLogBookEntries,
    listQuestLog,
    listKnownActions,
    listInventory: listOrCreateInventory,
    equip: (characterId, instanceId, slot) => itemEngine.equip(characterId, instanceId, slot),
    unequip: (characterId, target) => itemEngine.unequip(characterId, target)
  })
}

function rememberSheetContext(request: LoadCharacterSheetRequest): void {
  activeRequest = {
    characterId: request.characterId,
    characterName: request.characterName,
    abilityScores: { ...request.abilityScores },
    ...(request.currentHp === undefined ? {} : { currentHp: request.currentHp })
  }
}

export function loadCharacterSheet(
  ports: CharacterSheetPorts,
  request: LoadCharacterSheetRequest
): CharacterSheetSnapshot {
  ensureDemoCharacterSheetData(request.characterId)
  rememberSheetContext(request)
  return buildCharacterSheetSnapshot(ports, request)
}

export function equipCharacterSheetItem(
  ports: CharacterSheetPorts,
  request: EquipItemRequest
): CharacterSheetSnapshot {
  const context = requireContext(request.characterId)
  return equipAndReload(ports, context, request.instanceId, request.slot)
}

export function unequipCharacterSheetItem(
  ports: CharacterSheetPorts,
  request: UnequipItemRequest
): CharacterSheetSnapshot {
  const context = requireContext(request.characterId)
  return unequipAndReload(ports, context, request.target)
}

function listOrCreateInventory(characterId: string) {
  try {
    return itemEngine.listInventory(characterId)
  } catch {
    return itemEngine.createInventory(characterId)
  }
}

function requireContext(characterId: string): LoadCharacterSheetRequest {
  if (activeRequest === null || activeRequest.characterId !== characterId) {
    throw new Error(`Character sheet context missing for ${characterId}`)
  }
  return activeRequest
}
