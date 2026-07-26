import type { SceneBlock, SocialLine } from '@weaver/narration-engine'
import type {
  CombatChromeSnapshot,
  SubmitPlayActionSuccess
} from '../../../shared/play/types'

export type PlayTurnUiState = {
  scene: SceneBlock[]
  social: SocialLine[]
  combat: CombatChromeSnapshot
  draftText: string
  turnError: string | null
  busy: boolean
}

type PlayTurnUiEvent =
  | { type: 'draft'; text: string }
  | { type: 'submit-started'; text: string }
  | { type: 'submit-failed'; message: string }
  | { type: 'submit-succeeded'; result: SubmitPlayActionSuccess }
  | { type: 'clear-error' }

export function createPlayTurnUiState(): PlayTurnUiState {
  return {
    scene: [],
    social: [],
    combat: { active: false },
    draftText: '',
    turnError: null,
    busy: false
  }
}

export function reducePlayTurnUi(state: PlayTurnUiState, event: PlayTurnUiEvent): PlayTurnUiState {
  if (event.type === 'draft') return { ...state, draftText: event.text }
  if (event.type === 'submit-started') {
    return { ...state, draftText: event.text, busy: true, turnError: null }
  }
  if (event.type === 'submit-failed') {
    return { ...state, busy: false, turnError: event.message }
  }
  if (event.type === 'submit-succeeded') return applySuccess(state, event.result)
  return { ...state, turnError: null }
}

export function applyPlayTurnOutcome(
  state: PlayTurnUiState,
  result: SubmitPlayActionSuccess
): PlayTurnUiState {
  return reducePlayTurnUi(state, { type: 'submit-succeeded', result })
}

export function nextSessionDraftAfterOutcome(
  previousText: string,
  outcome: 'success' | 'failure'
): string {
  return outcome === 'success' ? '' : previousText
}

function applySuccess(
  state: PlayTurnUiState,
  result: SubmitPlayActionSuccess
): PlayTurnUiState {
  return {
    ...state,
    busy: false,
    draftText: '',
    turnError: null,
    scene: [...result.scene],
    social: [...result.social],
    combat: result.combat
  }
}
