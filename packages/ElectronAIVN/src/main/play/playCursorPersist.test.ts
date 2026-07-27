import { describe, expect, it, vi } from 'vitest'
import { incrementStoryTurns, shouldCompleteAct } from './playCursorPersist.js'

describe('incrementStoryTurns', () => {
  it('starts at 1 when no counter is stored', () => {
    const store = new Map<string, string>()
    const session = metaSession(store)
    expect(incrementStoryTurns(session)).toBe(1)
    expect(store.get('vn_story_turns')).toBe('1')
  })

  it('increments an existing counter', () => {
    const store = new Map<string, string>([['vn_story_turns', '3']])
    expect(incrementStoryTurns(metaSession(store))).toBe(4)
  })

  it('recovers from a corrupt counter value', () => {
    const store = new Map<string, string>([['vn_story_turns', 'not-a-number']])
    expect(incrementStoryTurns(metaSession(store))).toBe(1)
  })
})

describe('shouldCompleteAct', () => {
  it('completes an act every second story turn', () => {
    expect(shouldCompleteAct('story', 1)).toBe(false)
    expect(shouldCompleteAct('story', 2)).toBe(true)
    expect(shouldCompleteAct('story', 4)).toBe(true)
  })

  it('never completes acts once in freeplay', () => {
    expect(shouldCompleteAct('freeplay', 2)).toBe(false)
    expect(shouldCompleteAct('freeplay', 4)).toBe(false)
  })
})

function metaSession(store: Map<string, string>) {
  return {
    readMeta: vi.fn((key: string) => store.get(key)),
    upsertMeta: vi.fn((key: string, value: string) => {
      store.set(key, value)
    })
  }
}
