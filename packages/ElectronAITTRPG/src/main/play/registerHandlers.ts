import { ipcMain } from 'electron'
import type { AskDmRequest, SubmitPlayActionRequest } from '../../shared/play/types.js'
import type { LivePlayDeps } from './livePlayDeps.js'

export function registerPlayHandlers(deps: LivePlayDeps): void {
  ipcMain.handle('play:submitAction', (_event, request: SubmitPlayActionRequest) =>
    deps.turnService.submitAction(request)
  )
  ipcMain.handle('play:askDm', (_event, request: AskDmRequest) => deps.askDmService.ask(request))
}
