import { ipcMain } from 'electron'
import { app } from 'electron'
import { join } from 'node:path'
import type {
  CampaignCreateDraft,
  GenerateRegionNpcRequest,
  RegenerateSectionRequest,
  UpdateReviewFieldRequest
} from '../../shared/campaignCreate/types.js'
import {
  createCampaignCreateService,
  type CampaignCreateService
} from './campaignCreateService.js'
import { createLiveGenerationPort } from './runGeneration.js'

type CampaignCreateHandlerDeps = {
  service: CampaignCreateService
}

function createLiveCampaignCreateHandlerDeps(): CampaignCreateHandlerDeps {
  const campaignsRoot = join(app.getPath('userData'), 'campaigns')
  return {
    service: createCampaignCreateService(createLiveGenerationPort(campaignsRoot))
  }
}

export function registerCampaignCreateHandlers(
  deps: CampaignCreateHandlerDeps = createLiveCampaignCreateHandlerDeps()
): void {
  ipcMain.handle('campaignCreate:startGeneration', (_event, draft: CampaignCreateDraft) =>
    deps.service.startGeneration(draft)
  )
  ipcMain.handle('campaignCreate:getReview', () => deps.service.getReview())
  ipcMain.handle(
    'campaignCreate:updateReviewField',
    (_event, request: UpdateReviewFieldRequest) => deps.service.updateReviewField(request)
  )
  ipcMain.handle(
    'campaignCreate:regenerateSection',
    (_event, request: RegenerateSectionRequest) => deps.service.regenerateSection(request)
  )
  ipcMain.handle(
    'campaignCreate:generateRegionNpc',
    (_event, request: GenerateRegionNpcRequest) => deps.service.generateRegionNpc(request)
  )
  ipcMain.handle('campaignCreate:confirmReview', () => deps.service.confirmReview())
  ipcMain.handle('campaignCreate:assertCanContinue', () => deps.service.assertCanContinue())
}
