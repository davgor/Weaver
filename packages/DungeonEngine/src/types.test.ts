import { describe, expect, it } from 'vitest'
import {
  CHUNK_SIZE,
  TILE_TYPES,
  encodeTile,
  decodeTile,
  assertAabb,
  assertFloorRecord
} from './types.js'

describe('dungeon types', () => {
  it('locks tileType enum and chunk size', () => {
    expect(TILE_TYPES).toEqual(['wall', 'floor', 'door', 'stairsUp', 'stairsDown'])
    expect(CHUNK_SIZE).toBe(16)
  })

  it('round-trips tile encoding', () => {
    for (const tile of TILE_TYPES) {
      expect(decodeTile(encodeTile(tile))).toBe(tile)
    }
  })

  it('rejects invalid tile codes', () => {
    expect(() => decodeTile(99)).toThrow(/tile/)
  })

  it('validates AABB and floor records', () => {
    const bounds = { minX: 0, minY: 0, maxX: 9, maxY: 9 }
    expect(assertAabb(bounds)).toEqual(bounds)
    expect(() => assertAabb({ minX: 5, minY: 0, maxX: 1, maxY: 9 })).toThrow(/bounds/)
    const floor = assertFloorRecord({ floorIndex: 0, bounds, cellCount: 100 })
    expect(floor.floorIndex).toBe(0)
    expect(() => assertFloorRecord({ floorIndex: -1, bounds, cellCount: 1 })).toThrow(/floor/)
  })
})
