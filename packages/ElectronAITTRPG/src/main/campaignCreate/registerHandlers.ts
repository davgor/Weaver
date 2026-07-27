import { ipcMain } from 'electron'
import type {
  CampaignCreateDraft,
  GenerateRegionNpcRequest,
  RegenerateSectionRequest,
  UpdateReviewFieldRequest
} from '../../shared/campaignCreate/types.js'
import type { CampaignCreateService } from './campaignCreateService.js'

type CampaignCreateHandlerDeps = {
  service: CampaignCreateService
}

export function registerCampaignCreateHandlers(deps: CampaignCreateHandlerDeps): void {
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
