import type { VnStoryDraft } from '../../../shared/story/types'
import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  buildDefaultVnStoryDraft,
  validateVnStoryDraft
} from '../../../shared/story/types'

export type TellStoryFormState = VnStoryDraft & {
  error: string | null
}

export function createTellStoryFormState(): TellStoryFormState {
  return { ...buildDefaultVnStoryDraft(), error: null }
}

export function updateTellStoryField(
  state: TellStoryFormState,
  field: 'premise' | 'name' | 'personality' | 'appearance' | 'actCount',
  value: string
): TellStoryFormState {
  if (field === 'premise') return { ...state, premise: value, error: null }
  if (field === 'actCount') {
    const parsed = Number.parseInt(value, 10)
    return {
      ...state,
      actCount: Number.isFinite(parsed) ? parsed : state.actCount,
      error: null
    }
  }
  return {
    ...state,
    mainCharacter: { ...state.mainCharacter, [field]: value },
    error: null
  }
}

export function draftFromForm(state: TellStoryFormState): VnStoryDraft {
  return {
    premise: state.premise,
    mainCharacter: { ...state.mainCharacter },
    actCount: state.actCount
  }
}

export function validateTellStoryForm(state: TellStoryFormState): TellStoryFormState {
  try {
    validateVnStoryDraft(draftFromForm(state))
    return { ...state, error: null }
  } catch (error) {
    return {
      ...state,
      error: error instanceof Error ? error.message : 'Invalid story draft'
    }
  }
}

export const ACT_COUNT_HELP = `Acts: ${VN_STORY_ACT_COUNT_MIN}–${VN_STORY_ACT_COUNT_MAX} (default ${VN_STORY_ACT_COUNT_DEFAULT})`
