import type { CharacterSheetApi } from './characterSheet/types.js'
import type { NpcDossierApi } from './npcDossier/types.js'
import type { SettingsApi } from './settings/types.js'
import type { SettingsIntroApi } from './settings/settingsIntroTypes.js'
import type { CampaignCreateApi } from './campaignCreate/types.js'
import type { OnboardingApi } from './onboarding/types.js'
import type { CampaignsApi } from './campaigns/types.js'
import type { CampaignHubApi } from './campaignHub/types.js'
import type { PlayApi } from './play/types.js'

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
  campaigns: CampaignsApi
  campaignCreate: CampaignCreateApi
  campaignHub: CampaignHubApi
  play: PlayApi
  onboarding: OnboardingApi
  characterSheet: CharacterSheetApi
  npcDossier: NpcDossierApi
  settings: SettingsApi
  settingsIntro: SettingsIntroApi
  app: {
    getVersion: () => Promise<string>
  }
}

export type {
  CampaignsApi,
  CampaignSummary,
  CampaignLanding,
  OpenCampaignRequest,
  OpenCampaignResult
} from './campaigns/types.js'

export type {
  CampaignHubApi,
  CampaignHubCharacter,
  CampaignHubCompanion,
  CampaignHubSnapshot,
  CampaignWorldPreview
} from './campaignHub/types.js'

export type {
  AskDmRequest,
  AskDmResult,
  CombatChromeCombatant,
  CombatChromeSnapshot,
  D20RollFeedback,
  PlayApi,
  PlayContext,
  SubmitPlayActionRequest,
  SubmitPlayActionResult
} from './play/types.js'

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
