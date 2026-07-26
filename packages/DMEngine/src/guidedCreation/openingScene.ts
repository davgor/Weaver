import type { TextCompleter } from '@weaver/narration-engine'
import { mechanicalDecisionErrors } from './mechanicalGuard.js'
import { requireGuidedCreationState, saveGuidedCreationState } from './phaseState.js'
import type {
  ConfirmOpeningSceneInput,
  GenerateOpeningSceneInput,
  GuidedCreationNarrationApi,
  GuidedCreationState,
  OpeningSceneResult
} from './types.js'

const OPENING_SCENE_SKELETON = '{{OPENING_SCENE}}'

export async function generateOpeningScene(
  input: GenerateOpeningSceneInput,
  narration: GuidedCreationNarrationApi,
  completer: TextCompleter
): Promise<OpeningSceneResult> {
  const state = requireGuidedCreationState(input.characterId)
  assertOpeningScenePhase(state)
  const result = await narration.fillAndValidate(
    {
      skeleton: OPENING_SCENE_SKELETON,
      facts: state.characterFacts,
      stage: openingSceneStage(state)
    },
    completer
  )
  const prose = result.filled.OPENING_SCENE
  if (!result.ok || prose === undefined) {
    return { ok: false, errors: result.errors }
  }
  const errors = mechanicalDecisionErrors(prose)
  if (errors.length > 0) {
    return { ok: false, errors }
  }
  saveGuidedCreationState({ ...state, openingScene: prose, enterWorldUnlocked: false })
  return { ok: true, prose, errors: [] }
}

export function confirmOpeningScene(input: ConfirmOpeningSceneInput): GuidedCreationState {
  const state = requireGuidedCreationState(input.characterId)
  if (state.guidedCreationPhase === 'complete') {
    return state
  }
  if (state.openingScene === undefined) {
    throw new Error('Opening scene must be generated before entering the world.')
  }
  return saveGuidedCreationState({
    ...state,
    guidedCreationPhase: 'complete',
    enterWorldUnlocked: true
  })
}

function assertOpeningScenePhase(state: GuidedCreationState): void {
  if (state.guidedCreationPhase !== 'opening_scene') {
    throw new Error('Opening scene requires completed guided identity phases.')
  }
}

function openingSceneStage(state: GuidedCreationState): string {
  return [
    'guidedIdentity.openingScene',
    'Write a single opening scene for confirmation before play begins.',
    'Use only completed identity flavor and supplied character facts.',
    'Do not assign or change mechanical stats.',
    'Transcript:',
    ...state.transcript.map((entry) => `${entry.speaker}:${entry.phase}: ${entry.text}`)
  ].join('\n')
}
