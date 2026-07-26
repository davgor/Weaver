import { describe, expect, it } from 'vitest'
import { TurnRoutingError } from '@weaver/dm-engine'
import { TURN_FAILURE_MESSAGE } from '../../shared/play/recoveryCopy.js'
import { toPlayTurnFailure } from './turnFailure.js'

describe('toPlayTurnFailure', () => {
  it('maps TurnRoutingError and provider failures into retryable turn failures', () => {
    expect(toPlayTurnFailure(new TurnRoutingError('DM_TURN_ROUTE_INVALID', 'bad json'))).toEqual({
      ok: false,
      kind: 'turn',
      message: TURN_FAILURE_MESSAGE,
      code: 'DM_TURN_ROUTE_INVALID'
    })
    expect(toPlayTurnFailure(new Error('provider timeout'))).toEqual({
      ok: false,
      kind: 'turn',
      message: TURN_FAILURE_MESSAGE,
      code: 'PLAY_TURN_FAILED'
    })
  })
})
