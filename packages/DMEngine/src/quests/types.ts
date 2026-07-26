import type { QuestEntry, QuestKind, UpsertQuestInput } from './peerTypes.js'

export type CharacterQuestApi = {
  upsertQuest: (input: UpsertQuestInput) => QuestEntry
  listQuestLog: (characterId: string) => QuestEntry[]
}

export type QuestReferenceLookup = {
  hasNpc: (npcId: string) => boolean
  hasPlace: (placeId: string) => boolean
  hasItem: (itemId: string) => boolean
}

export type QuestProposalInput = {
  characterId: string
  questId: string
  kind: QuestKind
  title: string
  npcId?: string
  placeId?: string
  itemId?: string
}

export type QuestProgressInput = {
  characterId: string
  questId: string
  title: string
}

export type QuestTransitionInput = {
  characterId: string
  questId: string
}

export type { QuestEntry, QuestKind, UpsertQuestInput }
