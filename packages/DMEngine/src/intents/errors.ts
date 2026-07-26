export type DmIntentErrorCode =
  | 'DM_COMMERCE_REJECTED'
  | 'DM_TRAVEL_REJECTED'
  | 'DM_INTENT_INPUT_INVALID'

export class DmIntentError extends Error {
  readonly code: DmIntentErrorCode

  constructor(code: DmIntentErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DmIntentError'
    this.code = code
  }
}
