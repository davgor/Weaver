import { describe, expect, it } from 'vitest'
import { assertOverworldEntrance } from './entrance.js'

const world = {
  hasWorld: (worldId: string) => worldId === 'world_a',
  hasCell: (worldId: string, x: number, y: number) =>
    worldId === 'world_a' && x >= 0 && x <= 7 && y >= 0 && y <= 7
}

describe('assertOverworldEntrance', () => {
  it('accepts a valid world cell entrance', () => {
    expect(
      assertOverworldEntrance({ worldId: 'world_a', x: 3, y: 4, facing: 'north' }, world)
    ).toEqual({ worldId: 'world_a', x: 3, y: 4, facing: 'north' })
  })

  it('rejects a missing world', () => {
    expect(() =>
      assertOverworldEntrance({ worldId: 'missing', x: 0, y: 0 }, world)
    ).toThrow(/World not found/)
  })

  it('rejects coordinates outside the world', () => {
    expect(() =>
      assertOverworldEntrance({ worldId: 'world_a', x: 99, y: 0 }, world)
    ).toThrow(/Invalid entrance coordinates/)
  })
})
