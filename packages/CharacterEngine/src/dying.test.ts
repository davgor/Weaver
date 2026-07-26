import { describe, expect, it } from 'vitest'
import { CONDITION_EFFECTS } from './conditions.js'
import {
  applyDyingSave,
  createDyingState,
  evaluateDyingSaveRoll,
  isDyingSaveAutoFailedByUnconscious
} from './dying.js'

describe('dying-save state machine', () => {
  it('is distinct from Unconscious — Unconscious does not auto-fail dying saves', () => {
    expect(CONDITION_EFFECTS.Unconscious.autoFailAbilitySaves).toEqual(['Body', 'Agility'])
    expect(isDyingSaveAutoFailedByUnconscious()).toBe(false)
  })

  it('counts a roll of 10+ as a success and <10 as a failure', () => {
    expect(evaluateDyingSaveRoll(10)).toEqual({ successesDelta: 1, failuresDelta: 0, revived: false })
    expect(evaluateDyingSaveRoll(9)).toEqual({ successesDelta: 0, failuresDelta: 1, revived: false })
  })

  it('treats a natural 1 as two failures and a natural 20 as revival', () => {
    expect(evaluateDyingSaveRoll(1)).toEqual({ successesDelta: 0, failuresDelta: 2, revived: false })
    expect(evaluateDyingSaveRoll(20)).toEqual({ successesDelta: 0, failuresDelta: 0, revived: true })
  })

  it('stabilizes at three successes without triggering death-mode resolution', () => {
    const result = applyDyingSave(createDyingState(), 15)
    const second = applyDyingSave(result.state, 12)
    const third = applyDyingSave(second.state, 10)

    expect(third).toMatchObject({
      requiresDeathModeResolution: false,
      revived: false,
      state: { successes: 3, failures: 0, stable: true }
    })
  })

  it('triggers death-mode resolution only after three failures', () => {
    const first = applyDyingSave(createDyingState(), 5)
    const second = applyDyingSave(first.state, 4)
    const third = applyDyingSave(second.state, 3)

    expect(first.requiresDeathModeResolution).toBe(false)
    expect(second.requiresDeathModeResolution).toBe(false)
    expect(third).toMatchObject({
      requiresDeathModeResolution: true,
      revived: false,
      state: { successes: 0, failures: 3, stable: false }
    })
  })
})
