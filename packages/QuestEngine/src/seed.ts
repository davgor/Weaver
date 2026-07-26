import {
  clearWorldQuestsForCampaign,
  listWorldQuests,
  putWorldQuest,
  validateObjectiveRefs
} from './store.js'
import type {
  QuestIdPools,
  QuestObjective,
  SeedWorldQuestsInput,
  WorldQuest
} from './types.js'
import { QuestEngineError } from './errors.js'

const DEFAULT_MAIN = 1
const DEFAULT_SIDE = 2

/**
 * Idempotency: re-seeding the same campaignId **replaces** all world quests
 * for that campaign with a freshly derived set from the supplied seed/pools.
 */
export function seedWorldQuests(input: SeedWorldQuestsInput): WorldQuest[] {
  assertSeedInput(input)
  const mainCount = input.counts?.main ?? DEFAULT_MAIN
  const sideCount = input.counts?.side ?? DEFAULT_SIDE
  assertNonNegativeCount(mainCount, 'counts.main')
  assertNonNegativeCount(sideCount, 'counts.side')

  const planned = [
    ...planQuests(input, 'main', mainCount),
    ...planQuests(input, 'side', sideCount)
  ]
  for (const quest of planned) {
    validateObjectiveRefs(quest.objectives, input.lookup)
  }

  clearWorldQuestsForCampaign(input.campaignId)
  for (const quest of planned) {
    putWorldQuest(quest)
  }
  return listWorldQuests(input.campaignId)
}

function planQuests(
  input: SeedWorldQuestsInput,
  kind: 'main' | 'side',
  count: number
): WorldQuest[] {
  return range(count).map((index) => {
    const questId = `${input.campaignId}:${kind}:${index + 1}`
    const templateId = `template:${kind}`
    const objectives = buildObjectives(input.pools, input.seed, kind, index)
    return {
      questId,
      campaignId: input.campaignId,
      worldId: input.worldId,
      templateId,
      kind,
      status: 'seeded' as const,
      title: `${kind === 'main' ? 'Main' : 'Side'} quest ${index + 1}`,
      brief: `Seeded from ${input.seed}`,
      objectives
    }
  })
}

function buildObjectives(
  pools: QuestIdPools,
  seed: string,
  kind: 'main' | 'side',
  index: number
): QuestObjective[] {
  const key = `${seed}:${kind}:${index}`
  return [
    objective(`${kind}-${index + 1}-talk`, 'talk_to_npc', pick(pools.npcIds, key, 'npc'), 'Speak with the contact'),
    objective(`${kind}-${index + 1}-place`, 'reach_place', pick(pools.placeIds, key, 'place'), 'Reach the marked place'),
    objective(`${kind}-${index + 1}-item`, 'obtain_item', pick(pools.itemIds, key, 'item'), 'Obtain the required item')
  ]
}

function objective(
  objectiveId: string,
  kind: QuestObjective['kind'],
  targetId: string,
  summary: string
): QuestObjective {
  return { objectiveId, kind, targetId, summary }
}

function pick(ids: readonly string[], key: string, salt: string): string {
  if (ids.length === 0) {
    throw new QuestEngineError(
      'QUEST_INPUT_INVALID',
      `pools must include at least one id for ${salt}`
    )
  }
  const hash = hashString(`${key}:${salt}`)
  return ids[hash % ids.length]!
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function assertSeedInput(input: SeedWorldQuestsInput): void {
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.worldId, 'worldId')
  assertNonEmpty(input.seed, 'seed')
}

function assertNonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', `${label} must be a non-empty string`)
  }
}

function assertNonNegativeCount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new QuestEngineError('QUEST_INPUT_INVALID', `${label} must be a non-negative integer`)
  }
}

function range(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index)
}
