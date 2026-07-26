import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendCausalEvent,
  buildSessionRecap,
  getCharacterSessionCursor,
  listCausalEvents,
  recordCharacterSessionCursor,
  resetCausalTimelineStore,
  resetCharacterSessionCursorStore
} from '@weaver/dm-engine'

describe('ElectronAITTRPG contract: DMEngine session recap APIs', () => {
  beforeEach(() => {
    resetCausalTimelineStore()
    resetCharacterSessionCursorStore()
  })

  it('lists causal events, builds a character recap since cursor, and records a new cursor', () => {
    appendCausalEvent({
      campaignId: 'camp-recap',
      actorCharacterId: 'pc-1',
      kind: 'travel',
      summary: 'crossed the ash road',
      day: 3,
      at: 10
    })

    const events = listCausalEvents('camp-recap')
    const recap = buildSessionRecap({ events, lastSessionAt: 0, characterId: 'pc-1' })
    const cursor = recordCharacterSessionCursor({
      campaignId: 'camp-recap',
      characterId: 'pc-1',
      lastSessionAt: 10
    })

    expect(recap.paragraphs[0]).toContain('you traveled')
    expect(recap.eventIds).toEqual([events[0]?.id])
    expect(getCharacterSessionCursor('camp-recap', 'pc-1')).toEqual(cursor)
  })
})
