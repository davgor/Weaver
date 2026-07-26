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

describe('generateDungeonLayout topology', () => {
  it('exposes deterministic room and connection topology for a known fixture', () => {
    const layout = generateDungeonLayout({ seed: 7, width: 24, height: 20, floorCount: 2 })
    expect(layout.floors[0].rooms.slice(0, 3)).toEqual([
      {
        roomId: 'f0r0',
        floorIndex: 0,
        bounds: { minX: 4, minY: 1, maxX: 6, maxY: 4 },
        center: { x: 5, y: 3 }
      },
      {
        roomId: 'f0r1',
        floorIndex: 0,
        bounds: { minX: 12, minY: 1, maxX: 15, maxY: 3 },
        center: { x: 14, y: 2 }
      },
      {
        roomId: 'f0r2',
        floorIndex: 0,
        bounds: { minX: 19, minY: 1, maxX: 22, maxY: 3 },
        center: { x: 21, y: 2 }
      }
    ])
    expect(layout.floors[0].rooms).toHaveLength(9)
    expect(layout.connections.filter((c) => c.kind === 'corridor' && c.fromFloorIndex === 0)).toHaveLength(8)
    expect(layout.connections[0]).toMatchObject({
      connectionId: 'f0c0',
      kind: 'corridor',
      fromRoomId: 'f0r0',
      toRoomId: 'f0r1',
      fromFloorIndex: 0,
      toFloorIndex: 0
    })
    expect(layout.connections.find((c) => c.kind === 'stairs')).toEqual({
      connectionId: 'stairs0to1',
      kind: 'stairs',
      fromRoomId: 'f0r0',
      toRoomId: 'f1r0',
      fromFloorIndex: 0,
      toFloorIndex: 1,
      points: [
        { floorIndex: 0, x: 2, y: 3 },
        { floorIndex: 1, x: 2, y: 3 }
      ]
    })
  })
})
