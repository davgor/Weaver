import type {
  FillAndValidateInput,
  FillAndValidateResult,
  GuidedIdentityInput,
  GuidedIdentityResult,
  TextCompleter
} from '@weaver/narration-engine'

export type IdentityCreationPhase = 'who' | 'why' | 'where' | 'what'
export type GuidedCreationPhase = IdentityCreationPhase | 'opening_scene' | 'complete'
export type GuidedTranscriptSpeaker = 'player' | 'dm'

export type GuidedCreationTranscriptEntry = {
  speaker: GuidedTranscriptSpeaker
  phase: GuidedCreationPhase
  text: string
}

export type GuidedCreationState = {
  campaignId: string
  characterId: string
  guidedCreationPhase: GuidedCreationPhase
  transcript: GuidedCreationTranscriptEntry[]
  characterFacts: Record<string, string>
  enterWorldUnlocked: boolean
  openingScene?: string
}

export type StartGuidedIdentityInput = {
  campaignId: string
  characterId: string
}

export type SubmitGuidedIdentityInput = {
  characterId: string
  message: string
}

export type GenerateOpeningSceneInput = {
  characterId: string
}

export type ConfirmOpeningSceneInput = {
  characterId: string
}

export type GuidedIdentitySubmitResult =
  | {
      ok: true
      phase: GuidedCreationPhase
      prose: string
      state: GuidedCreationState
      errors: []
    }
  | {
      ok: false
      phase: GuidedCreationPhase
      errors: string[]
    }

export type OpeningSceneResult =
  | { ok: true; prose: string; errors: [] }
  | { ok: false; errors: string[] }

export type GuidedCreationNarrationApi = {
  generateGuidedIdentityReply: (
    input: GuidedIdentityInput,
    completer: TextCompleter
  ) => Promise<GuidedIdentityResult>
  fillAndValidate: (
    input: FillAndValidateInput,
    completer: TextCompleter
  ) => Promise<FillAndValidateResult>
}

export type CharacterIdentitySelection = {
  race?: { name: string; lore?: string }
  background?: { name: string; description?: string; personalStory?: string }
}

export type CharacterStartingLoadoutFact = {
  archetype?: string
  items: Array<{ templateId?: string; name?: string; quantity?: number }>
  actionIds: string[]
}

export type CompanionFact = {
  name: string
  archetype?: string
}

export type CharacterIdentityGroundingApi = {
  getCharacterIdentity: (characterId: string) => CharacterIdentitySelection | undefined
  getCharacterArchetype: (characterId: string) => string | undefined
  getCharacterStartingLoadout: (characterId: string) => CharacterStartingLoadoutFact | undefined
  getCompanionOnboardingStatus: (characterId: string) => string | undefined
  listCompanions: (characterId: string) => CompanionFact[]
}
