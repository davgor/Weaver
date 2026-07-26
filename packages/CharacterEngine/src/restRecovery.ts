import { CONDITIONS, type Condition } from './conditions.js'
import { getCharacterStats, restoreCharacterStats } from './hp.js'
import { getCampaignDay, nextDayAfterLongRest, setCampaignDay } from './timeRest.js'

/** Cleared by long rest (full recovery). Dying state is always cleared separately. */
export const REST_CLEARABLE_CONDITIONS = [
  'Prone',
  'Stunned',
  'Poisoned',
  'Unconscious'
] as const satisfies readonly Condition[]

/** Persist across long rest until a peer frees the character. */
export const REST_STICKY_CONDITIONS = ['Restrained'] as const satisfies readonly Condition[]

export type RestClearableCondition = (typeof REST_CLEARABLE_CONDITIONS)[number]
export type RestStickyCondition = (typeof REST_STICKY_CONDITIONS)[number]

export type LongRestInput = {
  campaignId: string
  characterIds?: readonly string[]
}

export type CharacterRestDelta = {
  characterId: string
  fromHp: number
  toHp: number
  clearedConditions: Condition[]
  clearsDying: boolean
}

export type LongRestPreview = {
  campaignId: string
  day: number
  characters: CharacterRestDelta[]
}

export type LongRestResult = {
  campaignId: string
  day: number
  recovered: CharacterRestDelta[]
}

const CLEARABLE = new Set<Condition>(REST_CLEARABLE_CONDITIONS)

export function listRestClearableConditions(): RestClearableCondition[] {
  return [...REST_CLEARABLE_CONDITIONS]
}

export function previewLongRest(input: LongRestInput): LongRestPreview {
  const day = nextDayAfterLongRest(getCampaignDay(input.campaignId))
  return {
    campaignId: input.campaignId,
    day,
    characters: collectRestDeltas(input.characterIds)
  }
}

export function longRest(input: LongRestInput | string): LongRestResult {
  const normalized = normalizeLongRestInput(input)
  const day = nextDayAfterLongRest(getCampaignDay(normalized.campaignId))
  setCampaignDay(normalized.campaignId, day)
  const recovered = applyRestRecovery(normalized.characterIds)
  return { campaignId: normalized.campaignId, day, recovered }
}

function normalizeLongRestInput(input: LongRestInput | string): LongRestInput {
  if (typeof input === 'string') {
    return { campaignId: input }
  }
  return input
}

function applyRestRecovery(characterIds: readonly string[] | undefined): CharacterRestDelta[] {
  return collectRestDeltas(characterIds).map((delta) => {
    applyDelta(delta)
    return delta
  })
}

function collectRestDeltas(characterIds: readonly string[] | undefined): CharacterRestDelta[] {
  if (characterIds === undefined || characterIds.length === 0) {
    return []
  }
  return characterIds.flatMap((characterId) => {
    const delta = buildRestDelta(characterId)
    return delta === undefined ? [] : [delta]
  })
}

function buildRestDelta(characterId: string): CharacterRestDelta | undefined {
  const stats = getCharacterStats(characterId)
  if (stats === undefined) {
    return undefined
  }
  return {
    characterId,
    fromHp: stats.currentHp,
    toHp: stats.maxHp,
    clearedConditions: CONDITIONS.filter(
      (condition) => CLEARABLE.has(condition) && stats.conditions.includes(condition)
    ),
    clearsDying: stats.dying !== null
  }
}

function applyDelta(delta: CharacterRestDelta): void {
  const stats = getCharacterStats(delta.characterId)
  if (stats === undefined) {
    return
  }
  restoreCharacterStats({
    characterId: stats.characterId,
    maxHp: stats.maxHp,
    currentHp: delta.toHp,
    dying: null,
    conditions: stats.conditions.filter((condition) => !CLEARABLE.has(condition))
  })
}
