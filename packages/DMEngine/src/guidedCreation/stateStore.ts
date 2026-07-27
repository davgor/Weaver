import type { GuidedCreationState, GuidedCreationTranscriptEntry } from './types.js'

export type GuidedCreationStateStore = {
  save: (state: GuidedCreationState) => GuidedCreationState
  load: (characterId: string) => GuidedCreationState | undefined
  list: (campaignId?: string) => GuidedCreationState[]
  delete: (characterId: string) => void
  clear: () => void
}

export function createMemoryGuidedCreationStateStore(): GuidedCreationStateStore {
  const states = new Map<string, GuidedCreationState>()
  return {
    save: (state) => {
      states.set(state.characterId, cloneGuidedCreationState(state))
      return cloneGuidedCreationState(state)
    },
    load: (characterId) => {
      const state = states.get(characterId)
      return state === undefined ? undefined : cloneGuidedCreationState(state)
    },
    list: (campaignId) =>
      [...states.values()]
        .filter((state) => campaignId === undefined || state.campaignId === campaignId)
        .map(cloneGuidedCreationState),
    delete: (characterId) => {
      states.delete(characterId)
    },
    clear: () => states.clear()
  }
}

export function cloneGuidedCreationState(state: GuidedCreationState): GuidedCreationState {
  return {
    campaignId: state.campaignId,
    characterId: state.characterId,
    guidedCreationPhase: state.guidedCreationPhase,
    transcript: state.transcript.map(cloneTranscriptEntry),
    characterFacts: { ...state.characterFacts },
    enterWorldUnlocked: state.enterWorldUnlocked,
    ...(state.openingScene === undefined ? {} : { openingScene: state.openingScene })
  }
}

function cloneTranscriptEntry(entry: GuidedCreationTranscriptEntry): GuidedCreationTranscriptEntry {
  return {
    speaker: entry.speaker,
    phase: entry.phase,
    text: entry.text
  }
}
