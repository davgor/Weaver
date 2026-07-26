import { ipcMain, app } from 'electron'
import { join } from 'node:path'
import type {
  DeleteCampaignRequest,
  ExportCampaignRequest,
  ImportCampaignRequest,
  OpenCampaignRequest
} from '../../shared/campaigns/types.js'
import { createLiveCampaignPortabilityPort } from './campaignPortability.js'
import type { CampaignsService } from './campaignsService.js'

type CampaignsHandlerDeps = {
  service: CampaignsService
}

export function registerCampaignsHandlers(deps: CampaignsHandlerDeps): void {
  const service = withCampaignPortability(deps.service, createLiveCampaignPortabilityPort(campaignsRoot()))
  ipcMain.handle('campaigns:list', () => service.list())
  ipcMain.handle('campaigns:open', (_event, request: OpenCampaignRequest) => service.open(request))
  ipcMain.handle('campaigns:export', (_event, request: ExportCampaignRequest) => service.export(request))
  ipcMain.handle('campaigns:import', (_event, request: ImportCampaignRequest) => service.import(request))
  ipcMain.handle('campaigns:delete', (_event, request: DeleteCampaignRequest) => service.delete(request))
}

function campaignsRoot(): string {
  return join(app.getPath('userData'), 'campaigns')
}

function withCampaignPortability(
  service: CampaignsService,
  portability: ReturnType<typeof createLiveCampaignPortabilityPort>
): CampaignsService {
  return {
    list: () => mergeCampaignLists(service, portability),
    open: (request) => service.open(request),
    export: (request) => portability.exportCampaign(request),
    import: (request) => portability.importCampaign(request),
    delete: (request) => portability.deleteCampaign(request)
  }
}

async function mergeCampaignLists(
  service: CampaignsService,
  portability: ReturnType<typeof createLiveCampaignPortabilityPort>
) {
  const [diskCampaigns, listed] = await Promise.all([
    portability.listDiskCampaigns(),
    service.list()
  ])
  const merged = new Map(diskCampaigns.map((campaign) => [campaign.id, campaign]))
  for (const summary of listed) {
    if (portability.campaignExistsOnDisk(summary.id)) {
      merged.set(summary.id, summary)
    }
  }
  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name))
}
