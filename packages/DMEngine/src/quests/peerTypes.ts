/** Re-export CharacterEngine quest shapes without forcing deep imports at call sites. */

export type QuestKind = 'main' | 'side'
export type QuestStatus = 'active' | 'complete' | 'failed'

export type QuestEntry = {
  questId: string
  kind: QuestKind
  status: QuestStatus
  title?: string
}

export type UpsertQuestInput = QuestEntry & {
  characterId: string
}
