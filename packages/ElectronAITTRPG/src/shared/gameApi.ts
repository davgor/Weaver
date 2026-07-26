import type { CharacterSheetApi } from './characterSheet/types.js'

export type CampaignSummary = {
  id: string
  name: string
  lastPlayedAt: string | null
}

export type StartupBootSnapshot = {
  phase: 'booting' | 'ready' | 'failed'
  progress: number
  stageLabel: string
  statusText: string
  engineLabel: string
  failureMessage: string | null
}

export type GameApi = {
  windowControls: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  startup: {
    getBoot: () => Promise<StartupBootSnapshot>
  }
  campaigns: {
    list: () => Promise<CampaignSummary[]>
  }
  characterSheet: CharacterSheetApi
  app: {
    getVersion: () => Promise<string>
  }
}

export type {
  CharacterSheetApi,
  CharacterSheetSnapshot,
  CharacterSheetTab,
  EquipItemRequest,
  LoadCharacterSheetRequest,
  UnequipItemRequest
} from './characterSheet/types.js'
