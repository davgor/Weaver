export { buildCharacterFacts } from './characterFacts.js'
export { startGuidedIdentity, submitGuidedIdentityMessage } from './identityChat.js'
export { confirmOpeningScene, generateOpeningScene } from './openingScene.js'
export {
  bindGuidedCreationStateStore,
  exportGuidedCreationStates,
  getGuidedCreationState,
  importGuidedCreationStates,
  isGuidedCreationStateStoreBound,
  resetGuidedCreationStateStore,
  unbindGuidedCreationStateStore
} from './phaseState.js'
export type { GuidedCreationStateStore } from './stateStore.js'
export type {
  CharacterIdentityGroundingApi,
  CharacterIdentitySelection,
  CharacterStartingLoadoutFact,
  CompanionFact,
  ConfirmOpeningSceneInput,
  GenerateOpeningSceneInput,
  GuidedCreationNarrationApi,
  GuidedCreationPhase,
  GuidedCreationState,
  GuidedCreationTranscriptEntry,
  GuidedIdentitySubmitResult,
  GuidedTranscriptSpeaker,
  IdentityCreationPhase,
  OpeningSceneResult,
  StartGuidedIdentityInput,
  SubmitGuidedIdentityInput
} from './types.js'
