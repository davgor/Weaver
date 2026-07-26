import { describe, expect, it } from 'vitest'
import { classifyUrbanLandUse, urbanDensityAt } from './urbanDensity.js'

describe('urbanDensity', () => {
  it('is deterministic for a fixed seed and coordinates', () => {
    const a = urbanDensityAt({ worldSeed: 99, seedSalt: 7, x: 10, y: 12 })
    const b = urbanDensityAt({ worldSeed: 99, seedSalt: 7, x: 10, y: 12 })
    expect(a).toBe(b)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThanOrEqual(1)
  })

  it('classifies density bands into land uses', () => {
    expect(classifyUrbanLandUse(0.9)).toBe('building')
    expect(classifyUrbanLandUse(0.5)).toBe('road')
    expect(classifyUrbanLandUse(0.1)).toBe('district')
  })
})
