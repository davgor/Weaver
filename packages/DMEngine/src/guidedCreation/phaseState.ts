import type {
  GuidedCreationState,
  StartGuidedIdentityInput
} from './types.js'
import {
  cloneGuidedCreationState,
  createMemoryGuidedCreationStateStore,
  type GuidedCreationStateStore
} from './stateStore.js'

const memoryStore = createMemoryGuidedCreationStateStore()
let activeStore: GuidedCreationStateStore = memoryStore
let campaignStoreBound = false

export function bindGuidedCreationStateStore(store: GuidedCreationStateStore): void {
  activeStore = store
  campaignStoreBound = true
}

export function unbindGuidedCreationStateStore(): void {
  activeStore = memoryStore
  campaignStoreBound = false
}

export function isGuidedCreationStateStoreBound(): boolean {
  return campaignStoreBound
}

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
  return activeStore.save(state)
}

export function getGuidedCreationState(characterId: string): GuidedCreationState | undefined {
  return activeStore.load(characterId)
}

export function requireGuidedCreationState(characterId: string): GuidedCreationState {
  const state = getGuidedCreationState(characterId)
  if (state === undefined) {
    throw new Error(`Guided creation has not started for character ${characterId}.`)
  }
  return state
}

export function saveGuidedCreationState(state: GuidedCreationState): GuidedCreationState {
  return activeStore.save(state)
}

export function exportGuidedCreationStates(): GuidedCreationState[] {
  return activeStore.list()
}

export function importGuidedCreationStates(states: readonly GuidedCreationState[]): GuidedCreationState[] {
  activeStore.clear()
  for (const state of states) {
    activeStore.save(cloneGuidedCreationState(state))
  }
  return exportGuidedCreationStates()
}

export function resetGuidedCreationStateStore(): void {
  activeStore.clear()
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`Guided creation requires ${label}.`)
  }
}
