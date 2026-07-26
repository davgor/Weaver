export type CharacterEngineErrorCode =
  | 'ABILITY_SCORE_OUT_OF_RANGE'
  | 'POINT_BUY_OVER_BUDGET'
  | 'STANDARD_ARRAY_DUPLICATE'
  | 'STANDARD_ARRAY_INVALID'
  | 'DIE_ROLL_OUT_OF_RANGE'
  | 'HP_INPUT_INVALID'
  | 'RECORD_INPUT_INVALID'
  | 'ROSTER_INPUT_INVALID'
  | 'SELECTION_NOT_FOUND'
  | 'TIME_INPUT_INVALID'

export class CharacterEngineError extends Error {
  readonly code: CharacterEngineErrorCode

  constructor(code: CharacterEngineErrorCode, message: string) {
    super(message)
    this.name = 'CharacterEngineError'
    this.code = code
  }
}
