export type StartupBootSnapshot = {
  phase: 'booting' | 'ready' | 'failed'
  progress: number
  stageLabel: string
  statusText: string
  engineLabel: string
  failureMessage: string | null
}

export type LocalBackendPreference = 'vulkan' | 'cpu'

export type FirstRunSnapshot = {
  needed: boolean
  dismissed: boolean
  ready: boolean
  canDismiss: boolean
  reason: string | null
}

export type AivnLocalModelStatus = {
  phase: 'not_installed' | 'installing' | 'ready' | 'error'
  backend: LocalBackendPreference | null
  error: string | null
  bytesDownloaded: number
  bytesTotal: number | null
}

export type AivnInstallProgress = {
  phase: 'installing'
  bytesDownloaded: number
  bytesTotal: number | null
  fraction: number | null
}

export type BootProgressUpdate = {
  progress: number
  stageLabel: string
  statusText: string
}

export type {
  PlayVnStoryResult,
  VnSavedGameSummary,
  VnStoryApi,
  VnStoryDraft,
  VnStoryReviewSnapshot
} from './story/types.js'

export type {
  SubmitVnPlayActionRequest,
  VnPlayApi,
  VnPlaySnapshot
} from './play/types.js'

import type { VnStoryApi } from './story/types.js'
import type { VnPlayApi } from './play/types.js'

export type AivnApi = {
  windowControls: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  startup: {
    getBoot: () => Promise<StartupBootSnapshot>
    onBootProgress: (listener: (update: BootProgressUpdate) => void) => () => void
  }
  llm: {
    getStatus: () => Promise<AivnLocalModelStatus>
    install: () => Promise<AivnLocalModelStatus>
    onInstallProgress: (listener: (progress: AivnInstallProgress) => void) => () => void
    getBackend: () => Promise<LocalBackendPreference | null>
    setBackend: (backend: LocalBackendPreference) => Promise<LocalBackendPreference>
  }
  firstRun: {
    get: () => Promise<FirstRunSnapshot>
    dismiss: () => Promise<FirstRunSnapshot>
  }
  story: VnStoryApi
  play: VnPlayApi
  app: {
    getVersion: () => Promise<string>
  }
}
