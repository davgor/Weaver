import { DmQuestError } from './errors.js'
import type {
  CharacterQuestApi,
  QuestProgressInput,
  QuestProposalInput,
  QuestReferenceLookup,
  QuestTransitionInput
} from './types.js'
import type { QuestEntry, QuestStatus } from './peerTypes.js'

export function proposeQuest(
  quests: CharacterQuestApi,
  references: QuestReferenceLookup,
  input: QuestProposalInput
): QuestEntry {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.questId, 'questId')
  assertNonEmpty(input.title, 'title')
  validateReferences(references, input)
  return quests.upsertQuest({
    characterId: input.characterId,
    questId: input.questId,
    kind: input.kind,
    status: 'active',
    title: input.title
  })
}

export function updateQuestProgress(
  quests: CharacterQuestApi,
  input: QuestProgressInput
): QuestEntry {
  const existing = requireQuest(quests, input.characterId, input.questId)
  return quests.upsertQuest({
    characterId: input.characterId,
    questId: existing.questId,
    kind: existing.kind,
    status: existing.status,
    title: input.title
  })
}

export function completeQuest(
  quests: CharacterQuestApi,
  input: QuestTransitionInput
): QuestEntry {
  return transitionQuest(quests, input, 'complete')
}

export function failQuest(quests: CharacterQuestApi, input: QuestTransitionInput): QuestEntry {
  return transitionQuest(quests, input, 'failed')
}

function transitionQuest(
  quests: CharacterQuestApi,
  input: QuestTransitionInput,
  status: Extract<QuestStatus, 'complete' | 'failed'>
): QuestEntry {
  const existing = requireQuest(quests, input.characterId, input.questId)
  const base = {
    characterId: input.characterId,
    questId: existing.questId,
    kind: existing.kind,
    status
  }
  return existing.title === undefined
    ? quests.upsertQuest(base)
    : quests.upsertQuest({ ...base, title: existing.title })
}

function requireQuest(
  quests: CharacterQuestApi,
  characterId: string,
  questId: string
): QuestEntry {
  assertNonEmpty(characterId, 'characterId')
  assertNonEmpty(questId, 'questId')
  const entry = quests.listQuestLog(characterId).find((quest) => quest.questId === questId)
  if (entry === undefined) {
    throw new DmQuestError('DM_QUEST_NOT_FOUND', `Quest not found: ${questId}`)
  }
  return entry
}

function validateReferences(
  references: QuestReferenceLookup,
  input: QuestProposalInput
): void {
  rejectMissing(references.hasNpc, input.npcId, 'npc')
  rejectMissing(references.hasPlace, input.placeId, 'place')
  rejectMissing(references.hasItem, input.itemId, 'item')
}

function rejectMissing(
  exists: (id: string) => boolean,
  id: string | undefined,
  kind: 'npc' | 'place' | 'item'
): void {
  if (id === undefined) {
    return
  }
  if (!exists(id)) {
    throw new DmQuestError(
      'DM_QUEST_INVALID_REFERENCE',
      `Quest proposal references unknown ${kind}: ${id}`,
      { referenceKind: kind, referenceId: id }
    )
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new DmQuestError('DM_QUEST_INPUT_INVALID', `${label} must not be empty`)
  }
}
