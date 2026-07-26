import { describe, expect, it } from 'vitest'
import { generateDungeonLayout } from './generateLayout.js'
import { TILE_TYPES } from '../types.js'

describe('generateDungeonLayout', () => {
  it('is deterministic for the same seed and params', () => {
    const a = generateDungeonLayout({ seed: 42, width: 32, height: 24, floorCount: 2 })
    const b = generateDungeonLayout({ seed: 42, width: 32, height: 24, floorCount: 2 })
    expect(a).toEqual(b)
  })

  it('fills every cell with a known tile type', () => {
    const layout = generateDungeonLayout({ seed: 7, width: 24, height: 20, floorCount: 1 })
    expect(layout.floors).toHaveLength(1)
    const floor = layout.floors[0]
    expect(floor.grid).toHaveLength(20)
    expect(floor.grid[0]).toHaveLength(24)
    for (const row of floor.grid) {
      for (const tile of row) {
        expect(TILE_TYPES).toContain(tile)
      }
    }
  })

  it('produces walkable floor tiles and walls', () => {
    const layout = generateDungeonLayout({ seed: 99, width: 40, height: 30, floorCount: 1 })
    const flat = layout.floors[0].grid.flat()
    expect(flat.some((t) => t === 'floor')).toBe(true)
    expect(flat.some((t) => t === 'wall')).toBe(true)
  })

  it('places stairs between adjacent floors', () => {
    const layout = generateDungeonLayout({ seed: 3, width: 28, height: 28, floorCount: 3 })
    expect(layout.floors).toHaveLength(3)
    const hasUp = layout.floors[0].grid.flat().includes('stairsDown')
    const hasDown = layout.floors[1].grid.flat().includes('stairsUp')
    expect(hasUp).toBe(true)
    expect(hasDown).toBe(true)
  })
})
