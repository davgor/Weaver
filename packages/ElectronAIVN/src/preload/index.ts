import { contextBridge, ipcRenderer } from 'electron'
import type { AivnApi, StartupBootSnapshot } from '../shared/gameApi.js'

const api: AivnApi = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  startup: {
    getBoot: (): Promise<StartupBootSnapshot> => ipcRenderer.invoke('startup:getBoot')
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
  }
}

contextBridge.exposeInMainWorld('aivn', api)
