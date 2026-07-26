export const QUEST_KINDS = ['main', 'side'] as const
export type QuestKind = (typeof QUEST_KINDS)[number]

/** World-quest lifecycle — distinct from CharacterEngine PC log status. */
export const WORLD_QUEST_STATUSES = ['seeded', 'retired'] as const
export type WorldQuestStatus = (typeof WORLD_QUEST_STATUSES)[number]

export const OBJECTIVE_KINDS = ['talk_to_npc', 'reach_place', 'obtain_item'] as const
export type ObjectiveKind = (typeof OBJECTIVE_KINDS)[number]

export type QuestObjective = {
  objectiveId: string
  kind: ObjectiveKind
  targetId: string
  summary?: string
}

export type QuestTemplate = {
  templateId: string
  kind: QuestKind
  title?: string
  brief?: string
  objectives: QuestObjective[]
}

export type WorldQuest = {
  questId: string
  campaignId: string
  worldId: string
  templateId: string
  kind: QuestKind
  status: WorldQuestStatus
  title?: string
  brief?: string
  objectives: QuestObjective[]
}

export type QuestIdPools = {
  regionIds: readonly string[]
  placeIds: readonly string[]
  npcIds: readonly string[]
  itemIds: readonly string[]
  dungeonIds?: readonly string[]
}

export type QuestReferenceLookup = {
  hasNpc: (npcId: string) => boolean
  hasPlace: (placeId: string) => boolean
  hasItem: (itemId: string) => boolean
}

export type SeedWorldQuestsInput = {
  campaignId: string
  worldId: string
  seed: string
  pools: QuestIdPools
  counts?: { main?: number; side?: number }
  lookup?: QuestReferenceLookup
}

export type DefineQuestTemplateInput = {
  templateId: string
  kind: QuestKind
  title?: string
  brief?: string
  objectives: QuestObjective[]
  lookup?: QuestReferenceLookup
}
