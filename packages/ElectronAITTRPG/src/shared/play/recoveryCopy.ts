export const TURN_FAILURE_MESSAGE = "Your last action didn't go through — try again."
export const APP_FAILURE_MESSAGE = 'Something is wrong with the app.'

type PlayRecoveryKind = 'turn' | 'app'

export function playRecoveryCopy(kind: PlayRecoveryKind): string {
  return kind === 'turn' ? TURN_FAILURE_MESSAGE : APP_FAILURE_MESSAGE
}
