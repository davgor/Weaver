export type NpcEngineErrorCode =
  | 'NPC_NOT_FOUND'
  | 'NPC_INPUT_INVALID'
  | 'CAMPAIGN_MISMATCH'
  | 'FACTION_NOT_FOUND'
  | 'PORTRAIT_NOT_QUEUED'

export class NpcEngineError extends Error {
  readonly code: NpcEngineErrorCode

  constructor(code: NpcEngineErrorCode, message: string) {
    super(message)
    this.name = 'NpcEngineError'
    this.code = code
  }
}

export function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new NpcEngineError('NPC_INPUT_INVALID', `${label} must be non-empty`)
  }
}
