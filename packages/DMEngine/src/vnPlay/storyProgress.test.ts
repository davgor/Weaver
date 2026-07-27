import { describe, expect, it } from 'vitest'
import {
  advanceVnPlayCursor,
  initialVnPlayCursor,
  isVnFreeplay
} from './storyProgress.js'
import type { VnPlayCursor } from './playCursor.js'

function storyCursor(overrides: Partial<VnPlayCursor> = {}): VnPlayCursor {
  return {
    campaignId: 'camp-1',
    characterId: 'char-1',
    phase: 'story',
    storyComplete: false,
    actIndex: 1,
    beatId: 'opening',
    mode: 'scene',
    beatText: 'Opening beat.',
    speakerId: null,
    options: ['A', 'B'],
    updatedAt: '2026-07-27T00:00:00.000Z',
    ...overrides
  }
}

describe('initialVnPlayCursor', () => {
  it('starts at act 1, story phase, opening scene', () => {
    const cursor = initialVnPlayCursor({
      campaignId: 'camp-1',
      characterId: 'char-1',
      openingBeat: 'The bell tolls at dusk.',
      options: ['Answer it.', 'Ignore it.'],
      now: '2026-07-27T00:00:00.000Z'
    })
    expect(cursor).toEqual({
      campaignId: 'camp-1',
      characterId: 'char-1',
      phase: 'story',
      storyComplete: false,
      actIndex: 1,
      beatId: 'opening',
      mode: 'scene',
      beatText: 'The bell tolls at dusk.',
      speakerId: null,
      options: ['Answer it.', 'Ignore it.'],
      updatedAt: '2026-07-27T00:00:00.000Z'
    })
  })
})

describe('advanceVnPlayCursor', () => {
  it('updates turn fields without changing act when not completing an act', () => {
    const next = advanceVnPlayCursor({
      cursor: storyCursor(),
      actCount: 3,
      mode: 'npc',
      beatId: 'beat-2',
      beatText: 'The warden speaks.',
      speakerId: 'npc-warden',
      options: ['Trust.', 'Doubt.'],
      now: '2026-07-27T01:00:00.000Z'
    })
    expect(next.mode).toBe('npc')
    expect(next.beatId).toBe('beat-2')
    expect(next.beatText).toBe('The warden speaks.')
    expect(next.speakerId).toBe('npc-warden')
    expect(next.options).toEqual(['Trust.', 'Doubt.'])
    expect(next.updatedAt).toBe('2026-07-27T01:00:00.000Z')
    expect(next.actIndex).toBe(1)
    expect(next.phase).toBe('story')
    expect(next.storyComplete).toBe(false)
  })

  it('increments the act when completing a non-final act', () => {
    const next = advanceVnPlayCursor({
      cursor: storyCursor({ actIndex: 1 }),
      actCount: 3,
      mode: 'scene',
      beatId: 'beat-3',
      beatText: 'Act two opens.',
      speakerId: null,
      options: ['A', 'B'],
      completeAct: true
    })
    expect(next.actIndex).toBe(2)
    expect(next.phase).toBe('story')
    expect(next.storyComplete).toBe(false)
  })

  it('flips to freeplay + storyComplete when completing the final act', () => {
    const next = advanceVnPlayCursor({
      cursor: storyCursor({ actIndex: 3 }),
      actCount: 3,
      mode: 'scene',
      beatId: 'finale',
      beatText: 'The story resolves.',
      speakerId: null,
      options: ['A', 'B'],
      completeAct: true
    })
    expect(next.storyComplete).toBe(true)
    expect(next.phase).toBe('freeplay')
    expect(next.actIndex).toBe(3)
  })

  it('keeps actIndex clamped at actCount when already past it', () => {
    const next = advanceVnPlayCursor({
      cursor: storyCursor({ actIndex: 5 }),
      actCount: 3,
      mode: 'scene',
      beatId: 'finale',
      beatText: 'Resolves.',
      speakerId: null,
      options: ['A', 'B'],
      completeAct: true
    })
    expect(next.actIndex).toBe(3)
    expect(next.storyComplete).toBe(true)
    expect(next.phase).toBe('freeplay')
  })

  it('leaves phase/storyComplete/actIndex untouched in freeplay', () => {
    const next = advanceVnPlayCursor({
      cursor: storyCursor({ phase: 'freeplay', storyComplete: true, actIndex: 3 }),
      actCount: 3,
      mode: 'npc',
      beatId: 'sandbox-7',
      beatText: 'Free exploration continues.',
      speakerId: 'npc-2',
      options: ['A', 'B'],
      completeAct: true
    })
    expect(next.phase).toBe('freeplay')
    expect(next.storyComplete).toBe(true)
    expect(next.actIndex).toBe(3)
    expect(next.beatId).toBe('sandbox-7')
    expect(next.mode).toBe('npc')
  })
})

describe('isVnFreeplay', () => {
  it('is false for an in-progress story cursor', () => {
    expect(isVnFreeplay(storyCursor())).toBe(false)
  })

  it('is true when phase is freeplay', () => {
    expect(isVnFreeplay(storyCursor({ phase: 'freeplay' }))).toBe(true)
  })

  it('is true when storyComplete even if phase still reads story', () => {
    expect(isVnFreeplay(storyCursor({ storyComplete: true }))).toBe(true)
  })
})
