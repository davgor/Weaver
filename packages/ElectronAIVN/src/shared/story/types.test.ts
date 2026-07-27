import { describe, expect, it } from 'vitest'
import {
  VN_STORY_ACT_COUNT_DEFAULT as DmDefault,
  VN_STORY_ACT_COUNT_MAX as DmMax,
  VN_STORY_ACT_COUNT_MIN as DmMin
} from '@weaver/dm-engine'
import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  buildDefaultVnStoryDraft,
  validateVnStoryDraft
} from './types.js'

describe('VN act-count constants stay aligned with DMEngine', () => {
  it('mirrors DMEngine min/max/default', () => {
    expect(VN_STORY_ACT_COUNT_MIN).toBe(DmMin)
    expect(VN_STORY_ACT_COUNT_MAX).toBe(DmMax)
    expect(VN_STORY_ACT_COUNT_DEFAULT).toBe(DmDefault)
  })
})

describe('validateVnStoryDraft accepts a complete draft', () => {
  it('uses the default act count bounds', () => {
    expect(() => validateVnStoryDraft(validDraft())).not.toThrow()
    expect(buildDefaultVnStoryDraft().actCount).toBe(VN_STORY_ACT_COUNT_DEFAULT)
  })
})

describe('validateVnStoryDraft rejects incomplete fields', () => {
  it('requires premise and main-character fields', () => {
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
})

describe('validateVnStoryDraft rejects invalid act counts', () => {
  it('enforces the documented integer range', () => {
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
