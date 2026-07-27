import { describe, expect, it } from 'vitest'
import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  buildDefaultVnStoryDraft,
  validateVnStoryDraft
} from './types.js'

describe('validateVnStoryDraft', () => {
  it('accepts a complete draft with default act count bounds', () => {
    expect(() => validateVnStoryDraft(validDraft())).not.toThrow()
    expect(buildDefaultVnStoryDraft().actCount).toBe(VN_STORY_ACT_COUNT_DEFAULT)
    expect(VN_STORY_ACT_COUNT_MIN).toBe(1)
    expect(VN_STORY_ACT_COUNT_MAX).toBe(7)
  })

  it('rejects missing premise and main-character fields', () => {
    expect(() => validateVnStoryDraft({ ...validDraft(), premise: '  ' })).toThrow(
      /premise is required/i
    )
    expect(() =>
      validateVnStoryDraft({
        ...validDraft(),
        mainCharacter: { ...validDraft().mainCharacter, name: '' }
      })
    ).toThrow(/name is required/i)
    expect(() =>
      validateVnStoryDraft({
        ...validDraft(),
        mainCharacter: { ...validDraft().mainCharacter, personality: ' ' }
      })
    ).toThrow(/personality is required/i)
    expect(() =>
      validateVnStoryDraft({
        ...validDraft(),
        mainCharacter: { ...validDraft().mainCharacter, appearance: '' }
      })
    ).toThrow(/appearance is required/i)
  })

  it('rejects act counts outside the documented range', () => {
    expect(() => validateVnStoryDraft({ ...validDraft(), actCount: 0 })).toThrow(/act count/i)
    expect(() => validateVnStoryDraft({ ...validDraft(), actCount: 8 })).toThrow(/act count/i)
    expect(() => validateVnStoryDraft({ ...validDraft(), actCount: 1.5 })).toThrow(/act count/i)
  })
})

function validDraft() {
  return {
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    actCount: 3
  }
}
