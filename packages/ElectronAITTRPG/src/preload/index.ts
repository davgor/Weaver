import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AutoUpdateState,
  ManualUpdateCheckResult
} from '../shared/autoUpdate/types.js'
import { AUTO_UPDATE_EVENT_CHANNEL } from '../shared/autoUpdate/types.js'
import type {
  CampaignSummary,
  CharacterSheetSnapshot,
  EquipItemRequest,
  GameApi,
  LoadCharacterSheetRequest,
  StartupBootSnapshot,
  UnequipItemRequest
} from '../shared/gameApi.js'

const api: GameApi = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  startup: {
    getBoot: (): Promise<StartupBootSnapshot> => ipcRenderer.invoke('startup:getBoot')
  },
  campaigns: {
    list: (): Promise<CampaignSummary[]> => ipcRenderer.invoke('campaigns:list')
  },
  characterSheet: {
    load: (request: LoadCharacterSheetRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:load', request),
    equip: (request: EquipItemRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:equip', request),
    unequip: (request: UnequipItemRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:unequip', request)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
  }
}

const autoUpdate = {
  getState: (): Promise<AutoUpdateState> => ipcRenderer.invoke('autoUpdate:getState'),
  checkForUpdates: (): Promise<ManualUpdateCheckResult> =>
    ipcRenderer.invoke('autoUpdate:checkForUpdates'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('autoUpdate:quitAndInstall'),
  onEvent: (listener: (payload: AutoUpdateState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: AutoUpdateState): void => {
      listener(payload)
    }
    ipcRenderer.on(AUTO_UPDATE_EVENT_CHANNEL, handler)
    return () => ipcRenderer.removeListener(AUTO_UPDATE_EVENT_CHANNEL, handler)
  }
}

contextBridge.exposeInMainWorld('aiTtrpg', api)
contextBridge.exposeInMainWorld('autoUpdate', autoUpdate)
