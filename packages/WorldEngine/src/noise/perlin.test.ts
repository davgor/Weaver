import { describe, expect, it } from 'vitest'
import { LAND_TYPES } from '../types.js'
import { classifyLandType, createWorldCell, perlinElevation } from './perlin.js'

describe('world Perlin generation', () => {
  it('is deterministic for the same seed at absolute coordinates', () => {
    const sample = [
      perlinElevation({ seed: 42, x: -128, y: 64 }),
      perlinElevation({ seed: 42, x: 0, y: 0 }),
      perlinElevation({ seed: 42, x: 91, y: -37 })
    ]
    expect(sample).toEqual([
      perlinElevation({ seed: 42, x: -128, y: 64 }),
      perlinElevation({ seed: 42, x: 0, y: 0 }),
      perlinElevation({ seed: 42, x: 91, y: -37 })
    ])
    expect(sample).not.toEqual([
      perlinElevation({ seed: 43, x: -128, y: 64 }),
      perlinElevation({ seed: 43, x: 0, y: 0 }),
      perlinElevation({ seed: 43, x: 91, y: -37 })
    ])
  })

  it('keeps elevation in normalized terrain range', () => {
    for (let y = -8; y <= 8; y++) {
      for (let x = -8; x <= 8; x++) {
        const elevation = perlinElevation({ seed: 7, x, y })
        expect(elevation).toBeGreaterThanOrEqual(0)
        expect(elevation).toBeLessThanOrEqual(1)
      }
    }
  })

  it('classifies elevation boundaries into the locked land types', () => {
    expect(classifyLandType(0)).toBe('ocean')
    expect(classifyLandType(0.3)).toBe('beach')
    expect(classifyLandType(0.36)).toBe('swamp')
    expect(classifyLandType(0.43)).toBe('grassland')
    expect(classifyLandType(0.55)).toBe('forest')
    expect(classifyLandType(0.66)).toBe('jungle')
    expect(classifyLandType(0.74)).toBe('desert')
    expect(classifyLandType(0.8)).toBe('tundra')
    expect(classifyLandType(0.87)).toBe('mountain')
  })

  it('creates pure cells with known land types and absolute coordinates', () => {
    const cell = createWorldCell({ seed: 11, x: -5, y: 9 })
    expect(cell).toMatchObject({ x: -5, y: 9 })
    expect(cell.elevation).toBeGreaterThanOrEqual(0)
    expect(LAND_TYPES).toContain(cell.landType)
    expect(createWorldCell({ seed: 11, x: -5, y: 9 })).toEqual(cell)
  })
})
