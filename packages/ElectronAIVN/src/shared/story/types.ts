import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  type VnMainCharacterBrief,
  type VnStoryActOverview,
  type VnStoryCastMember
} from '@weaver/dm-engine'

export {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN
}

export type VnStoryDraft = {
  premise: string
  mainCharacter: VnMainCharacterBrief
  actCount: number
}

export type VnStoryReviewStatus = 'idle' | 'generating' | 'ready' | 'error'

export type VnStoryReviewSnapshot = {
  campaignId: string
  status: VnStoryReviewStatus
  confirmed: boolean
  errorMessage?: string
  premiseSummary: string
  mainCharacter: VnMainCharacterBrief
  acts: VnStoryActOverview[]
  cast: VnStoryCastMember[]
  openingBeat: string
  overviewProse: string
  actCount: number
}

export type VnSavedGameSummary = {
  campaignId: string
  title: string
  premiseSummary: string
  actCount: number
  lifecycle: 'permanent'
}

export type PlayVnStoryResult = {
  campaignId: string
  lifecycle: 'permanent'
}

export type VnStoryApi = {
  startGeneration: (draft: VnStoryDraft) => Promise<VnStoryReviewSnapshot>
  getReview: () => Promise<VnStoryReviewSnapshot | null>
  confirmReview: () => Promise<VnStoryReviewSnapshot>
  backToEdit: () => Promise<void>
  play: () => Promise<PlayVnStoryResult>
  listSavedGames: () => Promise<VnSavedGameSummary[]>
}

export function buildDefaultVnStoryDraft(): VnStoryDraft {
  return {
    premise: '',
    mainCharacter: { name: '', personality: '', appearance: '' },
    actCount: VN_STORY_ACT_COUNT_DEFAULT
  }
}

export function validateVnStoryDraft(draft: VnStoryDraft): void {
  if (draft.premise.trim().length === 0) {
    throw new Error('Story premise is required')
  }
  assertMcField(draft.mainCharacter.name, 'Main character name')
  assertMcField(draft.mainCharacter.personality, 'Main character personality')
  assertMcField(draft.mainCharacter.appearance, 'Main character appearance')
  if (!isActCount(draft.actCount)) {
    throw new Error(
      `Act count must be an integer between ${VN_STORY_ACT_COUNT_MIN} and ${VN_STORY_ACT_COUNT_MAX}`
    )
  }
}

function assertMcField(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} is required`)
  }
}

function isActCount(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value >= VN_STORY_ACT_COUNT_MIN &&
    value <= VN_STORY_ACT_COUNT_MAX
  )
}
