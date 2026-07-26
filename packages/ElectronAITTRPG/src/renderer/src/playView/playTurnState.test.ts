import { describe, expect, it } from 'vitest'
import type { SubmitPlayActionSuccess } from '../../../shared/play/types'
import {
  applyPlayTurnOutcome,
  createPlayTurnUiState,
  nextSessionDraftAfterOutcome,
  reducePlayTurnUi
} from './playTurnState'

describe('playTurnState', () => {
  it('keeps the draft text when a turn fails so the player can retry the same input', () => {
    const state = createPlayTurnUiState()
    const submitting = reducePlayTurnUi(state, { type: 'submit-started', text: 'open the door' })
    expect(submitting.busy).toBe(true)
    expect(submitting.draftText).toBe('open the door')

    const failed = reducePlayTurnUi(submitting, {
      type: 'submit-failed',
      message: "Your last action didn't go through — try again."
    })
    expect(failed.busy).toBe(false)
    expect(failed.draftText).toBe('open the door')
    expect(failed.turnError).toMatch(/didn't go through/i)
    expect(failed.scene).toEqual([])
    expect(failed.social).toEqual([])
  })

  it('applies projections only after a successful turn and clears the draft', () => {
    const state = reducePlayTurnUi(createPlayTurnUiState(), {
      type: 'submit-started',
      text: 'look around'
    })
    const success = successResult()
    const next = applyPlayTurnOutcome(state, success)

    expect(next.busy).toBe(false)
    expect(next.draftText).toBe('')
    expect(next.turnError).toBeNull()
    expect(next.scene).toEqual(success.scene)
    expect(next.social).toEqual(success.social)
    expect(nextSessionDraftAfterOutcome('look around', 'success')).toBe('')
    expect(nextSessionDraftAfterOutcome('look around', 'failure')).toBe('look around')
  })
})

function successResult(): SubmitPlayActionSuccess {
  return {
    ok: true,
    scene: [{ id: 'scene-1', text: 'The door opens.', at: 1 }],
    social: [{ id: 'social-1', kind: 'npc', speakerId: 'mira', text: 'This way.', at: 2 }],
    combat: { active: false },
    roll: { visible: true, label: 'narration check', roll: 12 }
  }
}
