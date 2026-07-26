import { describe, expect, it } from 'vitest'
import { sampleWeather } from './sampleWeather.js'
import { WEATHER_CONDITIONS } from './types.js'

describe('sampleWeather', () => {
  it('is deterministic for the same inputs', () => {
    const input = { seed: 99, day: 12, x: 3, y: 7, landType: 'grassland' as const }
    expect(sampleWeather(input)).toEqual(sampleWeather(input))
  })

  it('returns a known condition and severity 1–5', () => {
    const sample = sampleWeather({ seed: 1, day: 1, x: 0, y: 0, landType: 'forest' })
    expect(WEATHER_CONDITIONS).toContain(sample.condition)
    expect(sample.severity).toBeGreaterThanOrEqual(1)
    expect(sample.severity).toBeLessThanOrEqual(5)
  })

  it('biases desert toward drought/heatwave and tundra toward snow', () => {
    const desert = new Set<string>()
    const tundra = new Set<string>()
    for (let day = 0; day < 40; day++) {
      desert.add(sampleWeather({ seed: 7, day, x: day, y: 0, landType: 'desert' }).condition)
      tundra.add(sampleWeather({ seed: 7, day, x: day, y: 0, landType: 'tundra' }).condition)
    }
    expect([...desert].some((c) => c === 'drought' || c === 'heatwave')).toBe(true)
    expect(desert.has('snow')).toBe(false)
    expect(tundra.has('snow')).toBe(true)
    expect(tundra.has('heatwave')).toBe(false)
  })
})
