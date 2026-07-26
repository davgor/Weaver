import { APP_FAILURE_MESSAGE } from '../../../shared/play/recoveryCopy'

export type PlayErrorBoundaryState = {
  hasError: boolean
}

type PlayErrorBoundaryEvent = { type: 'catch' } | { type: 'reset' }

type PlayErrorBoundaryFallback = {
  kind: 'app'
  message: string
  showReset: boolean
}

export function createPlayErrorBoundaryState(): PlayErrorBoundaryState {
  return { hasError: false }
}

export function reducePlayErrorBoundary(
  state: PlayErrorBoundaryState,
  event: PlayErrorBoundaryEvent
): PlayErrorBoundaryState {
  if (event.type === 'catch') return { hasError: true }
  return { hasError: false }
}

export function playErrorBoundaryFallback(
  state: PlayErrorBoundaryState
): PlayErrorBoundaryFallback | null {
  if (!state.hasError) return null
  return {
    kind: 'app',
    message: APP_FAILURE_MESSAGE,
    showReset: true
  }
}
