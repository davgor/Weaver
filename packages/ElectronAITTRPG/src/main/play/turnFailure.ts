import { TurnRoutingError } from '@weaver/dm-engine'
import type { SubmitPlayActionResult } from '../../shared/play/types.js'
import { TURN_FAILURE_MESSAGE } from '../../shared/play/recoveryCopy.js'

export function toPlayTurnFailure(error: unknown): Extract<SubmitPlayActionResult, { ok: false }> {
  if (error instanceof TurnRoutingError) {
    return {
      ok: false,
      kind: 'turn',
      message: TURN_FAILURE_MESSAGE,
      code: error.code
    }
  }
  return {
    ok: false,
    kind: 'turn',
    message: TURN_FAILURE_MESSAGE,
    code: 'PLAY_TURN_FAILED'
  }
}
