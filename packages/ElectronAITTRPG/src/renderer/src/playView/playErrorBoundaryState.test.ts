import { describe, expect, it } from 'vitest'
import {
  createPlayErrorBoundaryState,
  playErrorBoundaryFallback,
  reducePlayErrorBoundary
} from './playErrorBoundaryState'
import { APP_FAILURE_MESSAGE } from '../../../shared/play/recoveryCopy'

describe('playErrorBoundaryState', () => {
  it('enters a recoverable app-error fallback instead of staying blank', () => {
    const crashed = reducePlayErrorBoundary(createPlayErrorBoundaryState(), { type: 'catch' })
    expect(crashed.hasError).toBe(true)

    const fallback = playErrorBoundaryFallback(crashed)
    expect(fallback).toEqual({
      kind: 'app',
      message: APP_FAILURE_MESSAGE,
      showReset: true
    })

    const reset = reducePlayErrorBoundary(crashed, { type: 'reset' })
    expect(reset.hasError).toBe(false)
    expect(playErrorBoundaryFallback(reset)).toBeNull()
  })
})
