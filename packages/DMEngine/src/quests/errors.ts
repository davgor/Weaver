export type DmQuestErrorCode =
  | 'DM_QUEST_INVALID_REFERENCE'
  | 'DM_QUEST_INPUT_INVALID'
  | 'DM_QUEST_NOT_FOUND'

export class DmQuestError extends Error {
  readonly code: DmQuestErrorCode
  readonly referenceKind?: 'npc' | 'place' | 'item'
  readonly referenceId?: string

  constructor(
    code: DmQuestErrorCode,
    message: string,
    details?: { referenceKind?: 'npc' | 'place' | 'item'; referenceId?: string }
  ) {
    super(message)
    this.name = 'DmQuestError'
    this.code = code
    if (details?.referenceKind !== undefined) {
      this.referenceKind = details.referenceKind
    }
    if (details?.referenceId !== undefined) {
      this.referenceId = details.referenceId
    }
  }
}
