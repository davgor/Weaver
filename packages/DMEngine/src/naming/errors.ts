export class DmNamingError extends Error {
  constructor(
    readonly code:
      | 'DM_NAMING_INPUT_INVALID'
      | 'DM_NAMING_INVENT_FAILED'
      | 'DM_NAMING_UNVALIDATED'
      | 'DM_NAMING_REGION_NOT_FOUND'
      | 'DM_NAMING_SETTLEMENT_NOT_FOUND',
    message: string
  ) {
    super(message)
    this.name = 'DmNamingError'
  }
}
