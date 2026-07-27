import { QuestEngineError } from './errors.js'
import {
  OBJECTIVE_KINDS,
  QUEST_KINDS,
  WORLD_QUEST_STATUSES,
  type DefineQuestTemplateInput,
  type QuestObjective,
  type QuestReferenceLookup,
  type QuestTemplate,
  type WorldQuest
} from './types.js'

export type QuestCampaignStore = {
  saveQuestTemplate: (template: QuestTemplate) => QuestTemplate
  getQuestTemplate: (templateId: string) => QuestTemplate | undefined
  listQuestTemplates: () => QuestTemplate[]
  putWorldQuest: (quest: WorldQuest) => WorldQuest
  getWorldQuest: (questId: string) => WorldQuest | undefined
  listWorldQuests: (campaignId?: string) => WorldQuest[]
  deleteWorldQuest: (questId: string) => boolean
  clearWorldQuestsForCampaign: (campaignId: string) => number
  clearQuestStores: () => void
}

let activeStore: QuestCampaignStore = createMemoryQuestCampaignStore()
let campaignBound = false

export function createMemoryQuestCampaignStore(): QuestCampaignStore {
  const templates = new Map<string, QuestTemplate>()
  const worldQuests = new Map<string, WorldQuest>()

  return {
    saveQuestTemplate(template) {
      templates.set(template.templateId, copyTemplate(template))
      return copyTemplate(template)
    },
    getQuestTemplate(templateId) {
      const template = templates.get(templateId)
      return template === undefined ? undefined : copyTemplate(template)
    },
    listQuestTemplates() {
      return [...templates.values()].map(copyTemplate).sort(templateSort)
    },
    putWorldQuest(quest) {
      worldQuests.set(quest.questId, copyWorldQuest(quest))
      return copyWorldQuest(quest)
    },
    getWorldQuest(questId) {
      const quest = worldQuests.get(questId)
      return quest === undefined ? undefined : copyWorldQuest(quest)
    },
    listWorldQuests(campaignId) {
      return filteredWorldQuests([...worldQuests.values()], campaignId)
    },
    deleteWorldQuest: (questId) => worldQuests.delete(questId),
    clearWorldQuestsForCampaign(campaignId) {
      return deleteWorldQuestsForCampaign(worldQuests, campaignId)
    },
    clearQuestStores() {
      templates.clear()
      worldQuests.clear()
    }
  }
}

export function defineQuestTemplate(input: DefineQuestTemplateInput): QuestTemplate {
  assertNonEmpty(input.templateId, 'templateId')
  assertQuestKind(input.kind)
  const objectives = normalizeObjectives(input.objectives)
  validateObjectiveRefs(objectives, input.lookup)
  const template: QuestTemplate = {
    templateId: input.templateId,
    kind: input.kind,
    objectives,
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.brief === undefined ? {} : { brief: input.brief })
  }
  return activeStore.saveQuestTemplate(template)
}

export function getQuestTemplate(templateId: string): QuestTemplate | undefined {
  return activeStore.getQuestTemplate(templateId)
}

export function listQuestTemplates(): QuestTemplate[] {
  return activeStore.listQuestTemplates()
}

export function putWorldQuest(quest: WorldQuest): WorldQuest {
  const validated = validateWorldQuest(quest)
  return activeStore.putWorldQuest(validated)
}

export function getWorldQuest(questId: string): WorldQuest | undefined {
  return activeStore.getWorldQuest(questId)
}

export function listWorldQuests(campaignId?: string): WorldQuest[] {
  return activeStore.listWorldQuests(campaignId)
}

export function deleteWorldQuest(questId: string): boolean {
  return activeStore.deleteWorldQuest(questId)
}

export function clearWorldQuestsForCampaign(campaignId: string): number {
  return activeStore.clearWorldQuestsForCampaign(campaignId)
}

export function restoreWorldQuests(quests: readonly WorldQuest[]): void {
  for (const quest of quests) {
    putWorldQuest(quest)
  }
}

export function clearQuestStores(): void {
  activeStore.clearQuestStores()
}

export function bindQuestCampaignStore(store: QuestCampaignStore): void {
  activeStore = store
  campaignBound = true
}

export function unbindQuestCampaignStore(): void {
  activeStore = createMemoryQuestCampaignStore()
  campaignBound = false
}

export function isQuestCampaignStoreBound(): boolean {
  return campaignBound
}

export function validateObjectiveRefs(
  objectives: readonly QuestObjective[],
  lookup: QuestReferenceLookup | undefined
): void {
  if (lookup === undefined) {
    return
  }
  for (const objective of objectives) {
    rejectMissingRef(objective, lookup)
  }
}

function rejectMissingRef(objective: QuestObjective, lookup: QuestReferenceLookup): void {
  if (objective.kind === 'talk_to_npc' && !lookup.hasNpc(objective.targetId)) {
    throw refError('npc', objective.targetId)
  }
  if (objective.kind === 'reach_place' && !lookup.hasPlace(objective.targetId)) {
    throw refError('place', objective.targetId)
  }
  if (objective.kind === 'obtain_item' && !lookup.hasItem(objective.targetId)) {
    throw refError('item', objective.targetId)
  }
}

function refError(kind: 'npc' | 'place' | 'item', id: string): QuestEngineError {
  return new QuestEngineError(
    'QUEST_INVALID_REFERENCE',
    `Quest references unknown ${kind}: ${id}`,
    { referenceKind: kind, referenceId: id }
  )
}

function validateWorldQuest(quest: WorldQuest): WorldQuest {
  assertNonEmpty(quest.questId, 'questId')
  assertNonEmpty(quest.campaignId, 'campaignId')
  assertNonEmpty(quest.worldId, 'worldId')
  assertNonEmpty(quest.templateId, 'templateId')
  assertQuestKind(quest.kind)
  if (!WORLD_QUEST_STATUSES.includes(quest.status)) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', `Unknown world quest status: ${quest.status}`)
  }
  return {
    questId: quest.questId,
    campaignId: quest.campaignId,
    worldId: quest.worldId,
    templateId: quest.templateId,
    kind: quest.kind,
    status: quest.status,
    objectives: normalizeObjectives(quest.objectives),
    ...(quest.title === undefined ? {} : { title: quest.title }),
    ...(quest.brief === undefined ? {} : { brief: quest.brief })
  }
}

function normalizeObjectives(objectives: readonly QuestObjective[]): QuestObjective[] {
  if (!Array.isArray(objectives) || objectives.length === 0) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', 'objectives must be a non-empty array')
  }
  return objectives.map((objective, index) => {
    assertNonEmpty(objective.objectiveId, `objectives[${index}].objectiveId`)
    assertNonEmpty(objective.targetId, `objectives[${index}].targetId`)
    if (!OBJECTIVE_KINDS.includes(objective.kind)) {
      throw new QuestEngineError(
        'QUEST_INPUT_INVALID',
        `Unknown objective kind: ${String(objective.kind)}`
      )
    }
    return {
      objectiveId: objective.objectiveId,
      kind: objective.kind,
      targetId: objective.targetId,
      ...(objective.summary === undefined ? {} : { summary: objective.summary })
    }
  })
}

function assertQuestKind(kind: string): void {
  if (!QUEST_KINDS.includes(kind as (typeof QUEST_KINDS)[number])) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', `Unknown quest kind: ${kind}`)
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', `${label} must be a non-empty string`)
  }
}

function copyTemplate(template: QuestTemplate): QuestTemplate {
  return {
    templateId: template.templateId,
    kind: template.kind,
    objectives: template.objectives.map((objective) => ({ ...objective })),
    ...(template.title === undefined ? {} : { title: template.title }),
    ...(template.brief === undefined ? {} : { brief: template.brief })
  }
}

function copyWorldQuest(quest: WorldQuest): WorldQuest {
  return {
    questId: quest.questId,
    campaignId: quest.campaignId,
    worldId: quest.worldId,
    templateId: quest.templateId,
    kind: quest.kind,
    status: quest.status,
    objectives: quest.objectives.map((objective) => ({ ...objective })),
    ...(quest.title === undefined ? {} : { title: quest.title }),
    ...(quest.brief === undefined ? {} : { brief: quest.brief })
  }
}

function templateSort(left: QuestTemplate, right: QuestTemplate): number {
  return left.templateId.localeCompare(right.templateId)
}

function questSort(left: WorldQuest, right: WorldQuest): number {
  return left.questId.localeCompare(right.questId)
}

function filteredWorldQuests(
  quests: readonly WorldQuest[],
  campaignId: string | undefined
): WorldQuest[] {
  const copies = quests.map(copyWorldQuest)
  const filtered = campaignId === undefined ? copies : copies.filter((quest) => quest.campaignId === campaignId)
  return filtered.sort(questSort)
}

function deleteWorldQuestsForCampaign(
  worldQuests: Map<string, WorldQuest>,
  campaignId: string
): number {
  let cleared = 0
  for (const quest of filteredWorldQuests([...worldQuests.values()], campaignId)) {
    worldQuests.delete(quest.questId)
    cleared += 1
  }
  return cleared
}
