import { ipcMain } from 'electron'
import type { SubmitVnPlayActionRequest } from '../../shared/play/types.js'
import type { VnPlayService } from './playService.js'

export function registerVnPlayHandlers(service: VnPlayService): void {
  ipcMain.handle('vnPlay:open', (_event, campaignId: string) => service.open(campaignId))
  ipcMain.handle('vnPlay:submitAction', (_event, request: SubmitVnPlayActionRequest) =>
    service.submitAction(request)
  )
}
