import { describe, expect, it, beforeEach } from 'vitest'
import type { CausalEvent } from './types.js'
import {
  buildSessionRecap,
  getCharacterSessionCursor,
  recordCharacterSessionCursor,
  resetCharacterSessionCursorStore
} from './sessionRecap.js'

const CAMPAIGN = 'campaign-recap-test'
const PC_A = 'pc-recap-a'
const PC_B = 'pc-recap-b'

function causalEvent(partial: Partial<CausalEvent> & Pick<CausalEvent, 'id' | 'at'>): CausalEvent {
  return {
    campaignId: CAMPAIGN,
    actorCharacterId: PC_A,
    kind: 'travel',
    summary: 'journeyed onward',
    day: 2,
    seq: 1,
    ...partial
  }
}

describe('sessionRecap cursors', () => {
  beforeEach(() => {
    resetCharacterSessionCursorStore()
  })

  it('records and reads per-character last-session cursors', () => {
    recordCharacterSessionCursor({
      campaignId: CAMPAIGN,
      characterId: PC_A,
      lastSessionAt: 5_000
    })

    expect(getCharacterSessionCursor(CAMPAIGN, PC_A)).toEqual({
      campaignId: CAMPAIGN,
      characterId: PC_A,
      lastSessionAt: 5_000
    })
    expect(getCharacterSessionCursor(CAMPAIGN, PC_B)).toBeUndefined()
  })
})

describe('sessionRecap buildSessionRecap content', () => {
  it('builds a DM-style recap from events after lastSessionAt', () => {
    const events = [
      causalEvent({
        id: 'evt-old',
        at: 1_000,
        summary: 'old business'
      }),
      causalEvent({
        id: 'evt-own',
        at: 6_000,
        kind: 'travel',
        summary: 'crossed the ford'
      }),
      causalEvent({
        id: 'evt-other',
        actorCharacterId: PC_B,
        at: 7_000,
        kind: 'social',
        summary: 'negotiated with merchants'
      })
    ]

    const recap = buildSessionRecap({
      events,
      lastSessionAt: 5_000,
      characterId: PC_A
    })

    expect(recap.eventIds).toEqual(['evt-own', 'evt-other'])
    expect(recap.paragraphs.join(' ')).toMatch(/crossed the ford/)
    expect(recap.paragraphs.join(' ')).toMatch(/Meanwhile/)
    expect(recap.paragraphs.join(' ')).not.toMatch(/old business/)
  })

})

describe('sessionRecap buildSessionRecap determinism', () => {
  it('is re-derivable: identical inputs yield identical recap', () => {
    const events = [
      causalEvent({
        id: 'evt-repeat',
        at: 8_000,
        kind: 'combat',
        summary: 'drove off wolves'
      })
    ]
    const input = { events, lastSessionAt: 7_500, characterId: PC_A }

    expect(buildSessionRecap(input)).toEqual(buildSessionRecap(input))
  })

})

describe('sessionRecap buildSessionRecap empty', () => {
  it('returns a calm empty recap when nothing happened since last session', () => {
    const recap = buildSessionRecap({
      events: [causalEvent({ id: 'evt-past', at: 100 })],
      lastSessionAt: 500,
      characterId: PC_A
    })

    expect(recap.eventIds).toEqual([])
    expect(recap.paragraphs).toEqual([
      'Since your last session, the world has been quiet — nothing notable reached your ears.'
    ])
  })
})
