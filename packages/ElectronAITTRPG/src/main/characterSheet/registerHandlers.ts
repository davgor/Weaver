import { ipcMain } from 'electron'
import type {
  EquipItemRequest,
  LoadCharacterSheetRequest,
  UnequipItemRequest
} from '../../shared/characterSheet/types.js'
import {
  createLiveCharacterSheetPorts,
  equipCharacterSheetItem,
  loadCharacterSheet,
  unequipCharacterSheetItem,
  type CharacterSheetPorts
} from './sheetService.js'

export function registerCharacterSheetHandlers(
  ports: CharacterSheetPorts = createLiveCharacterSheetPorts()
): void {
  ipcMain.handle('characterSheet:load', (_event, request: LoadCharacterSheetRequest) =>
    loadCharacterSheet(ports, request)
  )
  ipcMain.handle('characterSheet:equip', (_event, request: EquipItemRequest) =>
    equipCharacterSheetItem(ports, request)
  )
  ipcMain.handle('characterSheet:unequip', (_event, request: UnequipItemRequest) =>
    unequipCharacterSheetItem(ports, request)
  )
}
