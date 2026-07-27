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

describe('initialVnPlayCursor starts at act 1 story opening', () => {
  it('returns the documented opening cursor', () => {
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

describe('advanceVnPlayCursor without completeAct', () => {
  it('updates turn fields and keeps act/phase', () => {
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
    expect(next.actIndex).toBe(1)
    expect(next.phase).toBe('story')
    expect(next.storyComplete).toBe(false)
  })
})

describe('advanceVnPlayCursor completing a non-final act', () => {
  it('increments actIndex', () => {
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
})

describe('advanceVnPlayCursor completing the final act', () => {
  it('flips to freeplay and storyComplete', () => {
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
})

describe('advanceVnPlayCursor when actIndex is already past actCount', () => {
  it('clamps actIndex and enters freeplay', () => {
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
})

describe('advanceVnPlayCursor while already in freeplay', () => {
  it('leaves phase and actIndex untouched', () => {
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
  })
})

describe('isVnFreeplay for in-progress story', () => {
  it('is false', () => {
    expect(isVnFreeplay(storyCursor())).toBe(false)
  })
})

describe('isVnFreeplay when phase is freeplay', () => {
  it('is true', () => {
    expect(isVnFreeplay(storyCursor({ phase: 'freeplay' }))).toBe(true)
  })
})

describe('isVnFreeplay when storyComplete', () => {
  it('is true even if phase still reads story', () => {
    expect(isVnFreeplay(storyCursor({ storyComplete: true }))).toBe(true)
  })
})
