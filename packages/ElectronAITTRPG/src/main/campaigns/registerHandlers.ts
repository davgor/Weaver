import { ipcMain } from 'electron'
import type { OpenCampaignRequest } from '../../shared/campaigns/types.js'
import type { CampaignsService } from './campaignsService.js'

type CampaignsHandlerDeps = {
  service: CampaignsService
}

export function registerCampaignsHandlers(deps: CampaignsHandlerDeps): void {
  ipcMain.handle('campaigns:list', () => deps.service.list())
  ipcMain.handle('campaigns:open', (_event, request: OpenCampaignRequest) => deps.service.open(request))
}
