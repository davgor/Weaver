import { contextBridge, ipcRenderer } from 'electron'
import type { WeaverAdminApi } from '../shared/engineCatalog.js'

const api: WeaverAdminApi = {
  listEngines: () => ipcRenderer.invoke('engines:list'),
  callEndpoint: (engineId: string, endpoint: string, payload?: unknown) =>
    ipcRenderer.invoke('engines:call', engineId, endpoint, payload)
}

contextBridge.exposeInMainWorld('weaverAdmin', api)
