import type { CharacterSheetApi } from './characterSheet/types.js'
import type { NpcDossierApi } from './npcDossier/types.js'
import type { SettingsApi } from './settings/types.js'

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
  npcDossier: NpcDossierApi
  settings: SettingsApi
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
