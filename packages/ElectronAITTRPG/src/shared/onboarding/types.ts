import type {
  AbilityScores,
  ArchetypeDefinition,
  ArchetypeId,
  BackgroundRosterEntry,
  RaceRosterEntry,
  RolledAbilityScoreDraft
} from '@weaver/character-engine'
import type { GuidedCreationState } from '@weaver/dm-engine'

export const WIZARD_PHASES = [
  'mechanical_setup',
  'race',
  'background',
  'equipment',
  'companions',
  'guided_identity',
  'opening_scene',
  'complete'
] as const

export type WizardPhase = (typeof WIZARD_PHASES)[number]

export type AbilityGenerationMethod = 'point_buy' | 'standard_array' | 'roll'

export type OnboardingContextRequest = {
  campaignId: string
  characterId: string
}

export type BeginOnboardingRequest = OnboardingContextRequest & {
  characterName: string
}

export type MechanicalSetupRequest = OnboardingContextRequest & {
  archetype: ArchetypeId
  method: AbilityGenerationMethod
  scores: AbilityScores
  rolledDraft?: RolledAbilityScoreDraft
}

export type RaceStepRequest = OnboardingContextRequest & {
  raceId: string
  lore?: string
}

export type BackgroundStepRequest = OnboardingContextRequest & {
  backgroundId: string
  personalStory?: string
}

export type EquipmentStepRequest = OnboardingContextRequest

export type CompanionsStepRequest = OnboardingContextRequest &
  (
    | { action: 'skip' }
    | { action: 'create'; name: string; archetype: ArchetypeId; bodyMod?: number }
  )

export type CompanionsStepPayload =
  | { action: 'skip' }
  | { action: 'create'; name: string; archetype: ArchetypeId; bodyMod?: number }

export type GuidedIdentityRequest = OnboardingContextRequest & {
  message: string
}

export type OnboardingSelectionsSnapshot = {
  archetype?: ArchetypeId
  abilityMethod?: AbilityGenerationMethod
  abilityScores?: AbilityScores
  raceId?: string
  raceName?: string
  backgroundId?: string
  backgroundName?: string
  personalStory?: string
  companionSkipped?: boolean
  companionName?: string
  companionArchetype?: ArchetypeId
}

export type OnboardingSnapshot = OnboardingContextRequest & {
  characterName: string
  phase: WizardPhase
  selections: OnboardingSelectionsSnapshot
  guidedCreation?: GuidedCreationState
  openingScene?: string
}

export type GuidedIdentityStepResult = {
  snapshot: OnboardingSnapshot
  reply?: string
  errors: string[]
}

export type OpeningSceneStepResult = {
  snapshot: OnboardingSnapshot
  prose?: string
  errors: string[]
}

export type OnboardingApi = {
  begin: (request: BeginOnboardingRequest) => Promise<OnboardingSnapshot>
  getState: (request: OnboardingContextRequest) => Promise<OnboardingSnapshot>
  saveMechanicalSetup: (request: MechanicalSetupRequest) => Promise<OnboardingSnapshot>
  saveRace: (request: RaceStepRequest) => Promise<OnboardingSnapshot>
  saveBackground: (request: BackgroundStepRequest) => Promise<OnboardingSnapshot>
  saveEquipment: (request: EquipmentStepRequest) => Promise<OnboardingSnapshot>
  saveCompanions: (request: CompanionsStepRequest) => Promise<OnboardingSnapshot>
  startGuidedIdentity: (request: OnboardingContextRequest) => Promise<OnboardingSnapshot>
  submitGuidedIdentity: (request: GuidedIdentityRequest) => Promise<GuidedIdentityStepResult>
  generateOpeningScene: (request: OnboardingContextRequest) => Promise<OpeningSceneStepResult>
  confirmOpeningScene: (request: OnboardingContextRequest) => Promise<OnboardingSnapshot>
  goBack: (request: OnboardingContextRequest) => Promise<OnboardingSnapshot>
  listArchetypes: () => Promise<ArchetypeDefinition[]>
  listRaces: (campaignId: string) => Promise<RaceRosterEntry[]>
  listBackgrounds: (campaignId: string) => Promise<BackgroundRosterEntry[]>
  rollAbilityScores: () => Promise<RolledAbilityScoreDraft>
}
