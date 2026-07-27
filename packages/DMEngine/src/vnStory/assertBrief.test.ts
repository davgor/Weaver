import { describe, expect, it } from 'vitest'
import { assertVnStoryBrief, assertVnStoryGenerationInput } from './assertBrief.js'
import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  type VnStoryBrief
} from './types.js'

describe('assertVnStoryBrief', () => {
  it('rejects empty premise and blank main-character fields', () => {
    expect(() => assertVnStoryBrief({ ...validBrief(), premise: '  ' })).toThrow(
      'premise must be a non-empty string'
    )
    expect(() => assertVnStoryBrief({
      ...validBrief(),
      mainCharacter: { ...validBrief().mainCharacter, name: '' }
    })).toThrow('mainCharacter.name must be a non-empty string')
    expect(() => assertVnStoryBrief({
      ...validBrief(),
      mainCharacter: { ...validBrief().mainCharacter, personality: '\n' }
    })).toThrow('mainCharacter.personality must be a non-empty string')
    expect(() => assertVnStoryBrief({
      ...validBrief(),
      mainCharacter: { ...validBrief().mainCharacter, appearance: '   ' }
    })).toThrow('mainCharacter.appearance must be a non-empty string')
  })

  it('rejects invalid act counts and defaults when omitted', () => {
    expect(() => assertVnStoryBrief({ ...validBrief(), actCount: 0 })).toThrow(
      `actCount must be an integer from ${VN_STORY_ACT_COUNT_MIN} to ${VN_STORY_ACT_COUNT_MAX}`
    )
    expect(() => assertVnStoryBrief({ ...validBrief(), actCount: 8 })).toThrow(
      `actCount must be an integer from ${VN_STORY_ACT_COUNT_MIN} to ${VN_STORY_ACT_COUNT_MAX}`
    )
    expect(() => assertVnStoryBrief({ ...validBrief(), actCount: 2.5 })).toThrow(
      `actCount must be an integer from ${VN_STORY_ACT_COUNT_MIN} to ${VN_STORY_ACT_COUNT_MAX}`
    )
    expect(assertVnStoryBrief(validBrief()).actCount).toBe(VN_STORY_ACT_COUNT_DEFAULT)
    expect(assertVnStoryBrief({ ...validBrief(), actCount: 5 }).actCount).toBe(5)
  })
})

describe('assertVnStoryGenerationInput', () => {
  it('rejects blank campaign paths', () => {
    expect(() => assertVnStoryGenerationInput({
      ...validBrief(),
      campaignId: ' ',
      dataRoot: '/tmp/data',
      campaignFilePath: '/tmp/story.sqlite'
    })).toThrow('campaignId must be a non-empty string')
  })
})

function validBrief(): VnStoryBrief {
  return {
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat, ink-stained fingers'
    }
  }
}
