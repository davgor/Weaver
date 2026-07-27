import { ipcMain } from 'electron'
import type { VnStoryDraft } from '../../shared/story/types.js'
import type { VnStoryService } from './storyService.js'

export function registerVnStoryHandlers(service: VnStoryService): void {
  ipcMain.handle('vnStory:startGeneration', (_event, draft: VnStoryDraft) =>
    service.startGeneration(draft)
  )
  ipcMain.handle('vnStory:getReview', () => service.getReview())
  ipcMain.handle('vnStory:confirmReview', () => service.confirmReview())
  ipcMain.handle('vnStory:backToEdit', () => service.backToEdit())
  ipcMain.handle('vnStory:play', () => service.play())
  ipcMain.handle('vnStory:listSavedGames', () => service.listSavedGames())
}
