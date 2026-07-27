import { ipcMain } from 'electron'
import type { CampaignHubService } from './campaignHubService.js'

type CampaignHubHandlerDeps = {
  service: CampaignHubService
}

export function registerCampaignHubHandlers(deps: CampaignHubHandlerDeps): void {
  ipcMain.handle('campaignHub:load', (_event, campaignId: string) => deps.service.load(campaignId))
  ipcMain.handle(
    'campaignHub:setActiveCharacter',
    (_event, campaignId: string, characterId: string | null) =>
      deps.service.setActiveCharacter(campaignId, characterId)
  )
  ipcMain.handle('campaignHub:addCharacter', (_event, campaignId: string) =>
    deps.service.addCharacter(campaignId)
  )
}
