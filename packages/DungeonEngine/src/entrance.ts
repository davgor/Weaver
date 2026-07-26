import type { OverworldEntrance } from './types.js'

export type WorldLookup = {
  hasWorld: (worldId: string) => boolean
  hasCell: (worldId: string, x: number, y: number) => boolean
}

export function assertOverworldEntrance(
  entrance: OverworldEntrance,
  world: WorldLookup
): OverworldEntrance {
  if (!Number.isInteger(entrance.x) || !Number.isInteger(entrance.y)) {
    throw new Error('Entrance coordinates must be integers')
  }
  if (!world.hasWorld(entrance.worldId)) {
    throw new Error(`World not found: ${entrance.worldId}`)
  }
  if (!world.hasCell(entrance.worldId, entrance.x, entrance.y)) {
    throw new Error(
      `Invalid entrance coordinates (${entrance.x}, ${entrance.y}) for world ${entrance.worldId}`
    )
  }
  return entrance
}
