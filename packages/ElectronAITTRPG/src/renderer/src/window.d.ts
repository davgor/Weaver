import type { GameApi } from '../../shared/gameApi'
import type {
  AutoUpdateState,
  ManualUpdateCheckResult
} from '../../shared/autoUpdate/types'

type AutoUpdateApi = {
  getState: () => Promise<AutoUpdateState>
  checkForUpdates: () => Promise<ManualUpdateCheckResult>
  quitAndInstall: () => Promise<void>
  onEvent: (listener: (payload: AutoUpdateState) => void) => () => void
}

declare global {
  interface Window {
    aiTtrpg: GameApi
    autoUpdate: AutoUpdateApi
  }
}

export {}
