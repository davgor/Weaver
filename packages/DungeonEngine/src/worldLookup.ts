import { worldEngine } from '@weaver/world-engine'
import type { WorldLookup } from './entrance.js'

export function createWorldEngineLookup(worldDataRoot: string): WorldLookup {
  return {
    hasWorld: (worldId) => worldEngine.hasWorld(worldDataRoot, worldId),
    hasCell: (worldId, x, y) => worldEngine.getCell({ dataRoot: worldDataRoot, worldId, x, y }) !== null
  }
}
