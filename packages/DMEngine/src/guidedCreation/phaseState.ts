import type {
  GuidedCreationPhase,
  GuidedCreationState,
  GuidedCreationTranscriptEntry,
  StartGuidedIdentityInput
} from './types.js'

const stateByCharacterId = new Map<string, GuidedCreationState>()

export function startGuidedIdentityState(input: StartGuidedIdentityInput): GuidedCreationState {
  assertText(input.campaignId, 'campaignId')
  assertText(input.characterId, 'characterId')
  const state: GuidedCreationState = {
    campaignId: input.campaignId,
    characterId: input.characterId,
    guidedCreationPhase: 'who',
    transcript: [],
    characterFacts: {},
    enterWorldUnlocked: false
  }
  stateByCharacterId.set(input.characterId, cloneState(state))
  return cloneState(state)
}

export function getGuidedCreationState(characterId: string): GuidedCreationState | undefined {
  const state = stateByCharacterId.get(characterId)
  return state === undefined ? undefined : cloneState(state)
}

export function requireGuidedCreationState(characterId: string): GuidedCreationState {
  const state = getGuidedCreationState(characterId)
  if (state === undefined) {
    throw new Error(`Guided creation has not started for character ${characterId}.`)
  }
  return state
}

export function saveGuidedCreationState(state: GuidedCreationState): GuidedCreationState {
  stateByCharacterId.set(state.characterId, cloneState(state))
  return cloneState(state)
}

export function exportGuidedCreationStates(): GuidedCreationState[] {
  return [...stateByCharacterId.values()].map(cloneState)
}

export function importGuidedCreationStates(states: readonly GuidedCreationState[]): GuidedCreationState[] {
  stateByCharacterId.clear()
  for (const state of states) {
    stateByCharacterId.set(state.characterId, normalizeState(state))
  }
  return exportGuidedCreationStates()
}

export function resetGuidedCreationStateStore(): void {
  stateByCharacterId.clear()
}

function normalizeState(state: GuidedCreationState): GuidedCreationState {
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

function cloneState(state: GuidedCreationState): GuidedCreationState {
  return normalizeState(state)
}

function cloneTranscriptEntry(entry: GuidedCreationTranscriptEntry): GuidedCreationTranscriptEntry {
  return {
    speaker: entry.speaker,
    phase: entry.phase as GuidedCreationPhase,
    text: entry.text
  }
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Guided creation requires ${label}.`)
  }
}
