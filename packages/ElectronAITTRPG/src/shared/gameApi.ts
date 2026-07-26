import type { CharacterSheetApi } from './characterSheet/types.js'
import type { NpcDossierApi } from './npcDossier/types.js'
import type { SettingsApi } from './settings/types.js'
import type { CampaignCreateApi } from './campaignCreate/types.js'
import type { OnboardingApi } from './onboarding/types.js'

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
  campaignCreate: CampaignCreateApi
  onboarding: OnboardingApi
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

export type {
  CampaignCreateApi,
  CampaignCreateDraft,
  CampaignReviewSnapshot,
  DeathMode,
  CampaignReviewSection,
  UpdateReviewFieldRequest,
  RegenerateSectionRequest,
  GenerateRegionNpcRequest
} from './campaignCreate/types.js'

export type {
  OnboardingApi,
  OnboardingSnapshot,
  OnboardingContextRequest,
  WizardPhase,
  BeginOnboardingRequest,
  GuidedIdentityRequest,
  MechanicalSetupRequest,
  RaceStepRequest,
  BackgroundStepRequest,
  EquipmentStepRequest,
  CompanionsStepRequest
} from './onboarding/types.js'
