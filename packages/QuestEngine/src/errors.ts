export type QuestEngineErrorCode =
  | 'QUEST_INPUT_INVALID'
  | 'QUEST_NOT_FOUND'
  | 'QUEST_INVALID_REFERENCE'

export class QuestEngineError extends Error {
  readonly code: QuestEngineErrorCode
  readonly referenceKind?: 'npc' | 'place' | 'item'
  readonly referenceId?: string

  constructor(
    code: QuestEngineErrorCode,
    message: string,
    details?: { referenceKind: 'npc' | 'place' | 'item'; referenceId: string }
  ) {
    super(message)
    this.name = 'QuestEngineError'
    this.code = code
    if (details !== undefined) {
      this.referenceKind = details.referenceKind
      this.referenceId = details.referenceId
    }
  }
}
