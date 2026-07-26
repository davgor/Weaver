import { describe, expect, it } from 'vitest'
import {
  CharacterEngineError,
  advanceTravelDayCounter,
  advanceTravelDays,
  clampTravelDays,
  getCampaignDay,
  longRest,
  nextDayAfterLongRest
} from './index.js'

describe('pure time and rest helpers', () => {
  it('advances long rests by exactly one day', () => {
    expect(nextDayAfterLongRest(4)).toBe(5)
  })

  it('clamps travel days to a sane 1-30 day range', () => {
    expect(clampTravelDays(0)).toBe(1)
    expect(clampTravelDays(12)).toBe(12)
    expect(clampTravelDays(90)).toBe(30)
  })

  it('rejects invalid travel-day types with a typed error', () => {
    expect(() => clampTravelDays(Number.NaN)).toThrowError(CharacterEngineError)
  })

  it('computes travel day-counter advances without mutating state', () => {
    expect(advanceTravelDayCounter(10, 50)).toEqual({
      currentDay: 10,
      advancedDays: 30,
      day: 40
    })
  })
})

describe('campaign day store', () => {
  it('keeps day counters campaign-scoped for rests and travel', () => {
    expect(getCampaignDay('campaign-time-a')).toBe(0)
    expect(longRest('campaign-time-a')).toEqual({ campaignId: 'campaign-time-a', day: 1 })
    expect(advanceTravelDays('campaign-time-a', 3)).toEqual({
      campaignId: 'campaign-time-a',
      advancedDays: 3,
      day: 4
    })
    expect(getCampaignDay('campaign-time-b')).toBe(0)
  })
})
