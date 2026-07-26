import { ipcMain } from 'electron'
import type { LoadNpcDossierRequest } from '../../shared/npcDossier/types.js'
import {
  createLiveNpcDossierPorts,
  loadNpcDossier,
  loadNpcOpinions,
  type NpcDossierPorts
} from './dossierService.js'

export function registerNpcDossierHandlers(
  ports: NpcDossierPorts = createLiveNpcDossierPorts()
): void {
  ipcMain.handle('npcDossier:load', (_event, request: LoadNpcDossierRequest) =>
    loadNpcDossier(ports, request)
  )
  ipcMain.handle('npcDossier:opinions', (_event, request: { npcId: string }) =>
    loadNpcOpinions(ports, request)
  )
}
