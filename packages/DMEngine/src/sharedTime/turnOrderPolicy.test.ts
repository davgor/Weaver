import { describe, expect, it } from 'vitest'
import type { CausalEvent } from './types.js'
import { compareCausalOrder, sortEventsByCausalOrder } from './turnOrderPolicy.js'

function event(partial: Partial<CausalEvent> & Pick<CausalEvent, 'id'>): CausalEvent {
  return {
    campaignId: 'campaign-turn',
    actorCharacterId: 'pc-a',
    kind: 'travel',
    summary: 'moved',
    day: 1,
    seq: 1,
    at: 1,
    ...partial
  }
}

describe('turnOrderPolicy', () => {
  it('orders events by day, then seq, then at timestamp', () => {
    const laterDay = event({ id: 'e-day', day: 3, seq: 1, at: 100 })
    const sameDayLaterSeq = event({ id: 'e-seq', day: 2, seq: 5, at: 50 })
    const sameDaySeqLaterAt = event({ id: 'e-at', day: 2, seq: 5, at: 200 })
    const earliest = event({ id: 'e-first', day: 2, seq: 1, at: 900 })

    const sorted = sortEventsByCausalOrder([
      laterDay,
      sameDaySeqLaterAt,
      earliest,
      sameDayLaterSeq
    ])

    expect(sorted.map((entry) => entry.id)).toEqual([
      'e-first',
      'e-seq',
      'e-at',
      'e-day'
    ])
  })

  it('compareCausalOrder is antisymmetric for distinct events', () => {
    const a = event({ id: 'a', seq: 1 })
    const b = event({ id: 'b', seq: 2 })

    expect(compareCausalOrder(a, b)).toBeLessThan(0)
    expect(compareCausalOrder(b, a)).toBeGreaterThan(0)
    expect(compareCausalOrder(a, a)).toBe(0)
  })
})
