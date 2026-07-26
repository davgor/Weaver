export type DyingState = {
  successes: number
  failures: number
  stable: boolean
}

export type DyingSaveRollEvaluation = {
  successesDelta: number
  failuresDelta: number
  revived: boolean
}

export type DyingSaveApplication = {
  state: DyingState
  revived: boolean
  requiresDeathModeResolution: boolean
  roll: number
}

const SUCCESS_THRESHOLD = 10
const STABILIZE_AT = 3
const DEATH_AT = 3

export function createDyingState(): DyingState {
  return { successes: 0, failures: 0, stable: false }
}

/** Dying saves are not ability saves — Unconscious never auto-fails them. */
export function isDyingSaveAutoFailedByUnconscious(): boolean {
  return false
}

export function evaluateDyingSaveRoll(roll: number): DyingSaveRollEvaluation {
  assertDyingRoll(roll)
  if (roll === 20) {
    return { successesDelta: 0, failuresDelta: 0, revived: true }
  }
  if (roll === 1) {
    return { successesDelta: 0, failuresDelta: 2, revived: false }
  }
  if (roll >= SUCCESS_THRESHOLD) {
    return { successesDelta: 1, failuresDelta: 0, revived: false }
  }
  return { successesDelta: 0, failuresDelta: 1, revived: false }
}

export function applyDyingSave(state: DyingState, roll: number): DyingSaveApplication {
  if (state.stable) {
    return {
      state: { ...state },
      revived: false,
      requiresDeathModeResolution: false,
      roll
    }
  }
  const evaluation = evaluateDyingSaveRoll(roll)
  if (evaluation.revived) {
    return {
      state: { successes: 0, failures: 0, stable: false },
      revived: true,
      requiresDeathModeResolution: false,
      roll
    }
  }
  return finalizeDyingSave(state, evaluation, roll)
}

function finalizeDyingSave(
  state: DyingState,
  evaluation: DyingSaveRollEvaluation,
  roll: number
): DyingSaveApplication {
  const successes = state.successes + evaluation.successesDelta
  const failures = state.failures + evaluation.failuresDelta
  if (failures >= DEATH_AT) {
    return {
      state: { successes, failures: DEATH_AT, stable: false },
      revived: false,
      requiresDeathModeResolution: true,
      roll
    }
  }
  if (successes >= STABILIZE_AT) {
    return {
      state: { successes: STABILIZE_AT, failures, stable: true },
      revived: false,
      requiresDeathModeResolution: false,
      roll
    }
  }
  return {
    state: { successes, failures, stable: false },
    revived: false,
    requiresDeathModeResolution: false,
    roll
  }
}

function assertDyingRoll(roll: number): void {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new Error('Dying save roll must be an integer from 1 to 20')
  }
}
