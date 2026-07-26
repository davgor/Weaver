import { describe, expect, it, beforeEach } from 'vitest'
import {
  appendCausalEvent,
  exportCausalTimelineStore,
  importCausalTimelineStore,
  listCausalEvents,
  listEventsSince,
  resetCausalTimelineStore
} from './causalTimeline.js'

const CAMPAIGN = 'campaign-causal-test'

describe('causalTimeline append and list', () => {
  beforeEach(() => {
    resetCausalTimelineStore()
  })

  it('appends events with monotonic seq per campaign and lists in causal order', () => {
    const first = appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-a',
      kind: 'travel',
      summary: 'Reached Riverford',
      day: 3,
      at: 1_000
    })
    const second = appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-b',
      kind: 'social',
      summary: 'Met the mayor',
      day: 3,
      at: 2_000
    })

    expect(first.seq).toBe(1)
    expect(second.seq).toBe(2)
    expect(first.id).toMatch(/^evt-/)
    expect(listCausalEvents(CAMPAIGN)).toEqual([first, second])
  })

  it('keeps timelines isolated per campaign', () => {
    appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-a',
      kind: 'travel',
      summary: 'A travels',
      day: 1,
      at: 100
    })
    appendCausalEvent({
      campaignId: 'campaign-other',
      actorCharacterId: 'pc-c',
      kind: 'travel',
      summary: 'C travels',
      day: 1,
      at: 200
    })

    expect(listCausalEvents(CAMPAIGN)).toHaveLength(1)
    expect(listCausalEvents('campaign-other')).toHaveLength(1)
  })
})

describe('causalTimeline cross-PC visibility', () => {
  beforeEach(() => {
    resetCausalTimelineStore()
  })

  it('lists events since a timestamp for cross-PC visibility', () => {
    appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-a',
      kind: 'combat',
      summary: 'Defeated bandits',
      day: 2,
      at: 1_000
    })
    appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-b',
      kind: 'explore',
      summary: 'Found a shrine',
      day: 2,
      at: 5_000
    })

    const since = listEventsSince(CAMPAIGN, 2_000)
    expect(since).toHaveLength(1)
    expect(since[0]?.actorCharacterId).toBe('pc-b')
  })
})

describe('causalTimeline store portability', () => {
  beforeEach(() => {
    resetCausalTimelineStore()
  })

  it('exports, imports, and resets the in-memory store', () => {
    const event = appendCausalEvent({
      campaignId: CAMPAIGN,
      actorCharacterId: 'pc-a',
      kind: 'rest',
      summary: 'Long rest at camp',
      day: 4,
      at: 9_000
    })

    const exported = exportCausalTimelineStore()
    resetCausalTimelineStore()
    expect(listCausalEvents(CAMPAIGN)).toEqual([])

    importCausalTimelineStore(exported)
    expect(listCausalEvents(CAMPAIGN)).toEqual([event])
  })
})
