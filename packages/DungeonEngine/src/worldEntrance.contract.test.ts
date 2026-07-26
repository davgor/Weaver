import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { worldEngine } from '@weaver/world-engine'
import { dungeonEngine } from './engineApi.js'

const roots: string[] = []

function tempRoot(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix))
  roots.push(root)
  return root
}

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

describe('DungeonEngine ↔ WorldEngine overworld entrance contract', () => {
  it('links a dungeon to a real WorldEngine cell and rejects missing/invalid worlds', () => {
    const worldRoot = tempRoot('weaver-world-')
    const dungeonRoot = tempRoot('weaver-dungeon-')
    const { meta: worldMeta } = worldEngine.createWorld(worldRoot, {
      worldId: 'overworld',
      seed: 7,
      width: 8,
      height: 8
    })
    const { meta: dungeonMeta } = dungeonEngine.createDungeon(dungeonRoot, {
      dungeonId: 'crypt',
      seed: 3,
      width: 16,
      height: 16
    })

    const entrance = dungeonEngine.setOverworldEntrance({
      dataRoot: dungeonRoot,
      dungeonId: dungeonMeta.dungeonId,
      worldDataRoot: worldRoot,
      entrance: { worldId: worldMeta.worldId, x: 2, y: 3, facing: 'east' }
    })
    expect(entrance).toEqual({ worldId: 'overworld', x: 2, y: 3, facing: 'east' })
    expect(dungeonEngine.getOverworldEntrance(dungeonRoot, dungeonMeta.dungeonId)).toEqual(entrance)

    expect(() =>
      dungeonEngine.setOverworldEntrance({
        dataRoot: dungeonRoot,
        dungeonId: dungeonMeta.dungeonId,
        worldDataRoot: worldRoot,
        entrance: { worldId: 'missing', x: 0, y: 0 }
      })
    ).toThrow(/World not found/)

    expect(() =>
      dungeonEngine.setOverworldEntrance({
        dataRoot: dungeonRoot,
        dungeonId: dungeonMeta.dungeonId,
        worldDataRoot: worldRoot,
        entrance: { worldId: 'overworld', x: 99, y: 0 }
      })
    ).toThrow(/Invalid entrance coordinates/)
  })
})
