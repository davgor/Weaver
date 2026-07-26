import { describe, expect, it } from 'vitest'
import {
  CHUNK_SIZE,
  LAND_TYPES,
  aabbCellCount,
  aabbHeight,
  aabbIntersects,
  aabbWidth,
  assertAabb,
  assertExpansionRecord,
  decodeLandType,
  encodeLandType,
  unionAabb
} from './types.js'

describe('world type constants', () => {
  it('locks land types and chunk size', () => {
    expect(LAND_TYPES).toEqual([
      'ocean',
      'beach',
      'grassland',
      'forest',
      'jungle',
      'desert',
      'mountain',
      'tundra',
      'swamp'
    ])
    expect(CHUNK_SIZE).toBe(32)
  })

  it('round-trips land-type encoding', () => {
    for (const landType of LAND_TYPES) {
      expect(decodeLandType(encodeLandType(landType))).toBe(landType)
    }
    expect(() => decodeLandType(99)).toThrow(/landType/)
  })
})

describe('world AABB and expansion invariants', () => {
  it('validates AABB shape invariants', () => {
    const bounds = { minX: -2, minY: 3, maxX: 4, maxY: 8 }
    expect(assertAabb(bounds)).toEqual(bounds)
    expect(aabbWidth(bounds)).toBe(7)
    expect(aabbHeight(bounds)).toBe(6)
    expect(aabbCellCount(bounds)).toBe(42)
    expect(aabbIntersects(bounds, { minX: 4, minY: 8, maxX: 6, maxY: 9 })).toBe(true)
    expect(aabbIntersects(bounds, { minX: 5, minY: 8, maxX: 6, maxY: 9 })).toBe(false)
    expect(unionAabb(bounds, { minX: -5, minY: 4, maxX: -4, maxY: 10 })).toEqual({
      minX: -5,
      minY: 3,
      maxX: 4,
      maxY: 10
    })
    expect(() => assertAabb({ minX: 4, minY: 0, maxX: 3, maxY: 2 })).toThrow(/bounds/)
  })

  it('validates expansion record shape invariants', () => {
    const bounds = { minX: 0, minY: 0, maxX: 3, maxY: 3 }
    const expansion = assertExpansionRecord({
      expansionId: 'expansion_0',
      worldId: 'world_1',
      sequence: 0,
      addedBounds: bounds,
      previousBounds: null,
      resultingBounds: bounds,
      createdAt: '2026-07-26T00:00:00.000Z',
      cellCount: 16
    })
    expect(expansion.sequence).toBe(0)
    expect(() => assertExpansionRecord({ ...expansion, sequence: -1 })).toThrow(/sequence/)
    expect(() => assertExpansionRecord({ ...expansion, cellCount: -1 })).toThrow(/cellCount/)
  })
})
