import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDungeonService } from './dungeonService.js'
import { readMeta, writeMeta } from './metaStore.js'

function withTempService(run: (svc: ReturnType<typeof createDungeonService>, root: string) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-dungeon-'))
  try {
    run(createDungeonService(dataRoot), dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('dungeonService', () => {
  it('creates, reloads, and queries a dungeon', () => {
    withTempService((svc, dataRoot) => {
      const created = svc.createDungeon({ seed: 11, floorCount: 2, width: 24, height: 20, theme: 'crypt' })
      expect(created.meta.floorCount).toBe(2)
      expect(svc.hasDungeon(created.meta.dungeonId)).toBe(true)
      const reopened = createDungeonService(dataRoot)
      expect(reopened.getDungeonMeta(created.meta.dungeonId).seed).toBe(11)
      expect(reopened.getCell({ dungeonId: created.meta.dungeonId, floorIndex: 0, x: 0, y: 0 })).toBeTruthy()
      expect(
        reopened.getDungeonSpecific({
          dungeonId: created.meta.dungeonId,
          floorIndex: 0,
          bounds: { minX: 0, minY: 0, maxX: 5, maxY: 5 }
        })
      ).toHaveLength(36)
      expect([...reopened.getFloor(created.meta.dungeonId, 0)]).toHaveLength(480)
      expect([...reopened.getDungeonWhole(created.meta.dungeonId)]).toHaveLength(960)
    })
  })

  it('lists, deletes, and rejects duplicate ids', () => {
    withTempService((svc) => {
      svc.createDungeon({ dungeonId: 'd1', seed: 1, width: 16, height: 16, floorCount: 1 })
      expect(() =>
        svc.createDungeon({ dungeonId: 'd1', seed: 2, width: 16, height: 16, floorCount: 1 })
      ).toThrow(/exists/)
      expect(svc.listDungeons()).toEqual(['d1'])
      expect(svc.listFloors('d1')).toHaveLength(1)
      expect(svc.getDungeonBounds('d1').minX).toBe(0)
      svc.deleteDungeon('d1')
      expect(svc.hasDungeon('d1')).toBe(false)
    })
  })

  it('throws for missing dungeons', () => {
    withTempService((svc) => {
      expect(() => svc.getDungeonMeta('nope')).toThrow(/not found/)
    })
  })
})

describe('dungeonService topology', () => {
  it('persists and queries room/corridor topology after reopening', () => {
    withTempService((svc, dataRoot) => {
      const created = svc.createDungeon({ dungeonId: 'fixture', seed: 7, floorCount: 2, width: 24, height: 20 })
      const reopened = createDungeonService(dataRoot)
      expect(reopened.listRooms(created.meta.dungeonId, 0)).toHaveLength(9)
      expect(reopened.getRoom(created.meta.dungeonId, 'f0r0')).toMatchObject({
        roomId: 'f0r0',
        floorIndex: 0,
        bounds: { minX: 4, minY: 1, maxX: 6, maxY: 4 }
      })
      expect(reopened.listConnections(created.meta.dungeonId, 0)).toHaveLength(9)
      expect(reopened.getTopology(created.meta.dungeonId, 1)).toMatchObject({
        rooms: expect.arrayContaining([expect.objectContaining({ roomId: 'f1r0', floorIndex: 1 })]),
        connections: expect.arrayContaining([expect.objectContaining({ connectionId: 'stairs0to1' })])
      })
    })
  })
})

describe('dungeonService reset lifecycle', () => {
  it('resets instance overlays idempotently while preserving geometry', () => {
    withTempService((svc, dataRoot) => {
      const created = svc.createDungeon({ dungeonId: 'resettable', seed: 13, floorCount: 1, width: 24, height: 20 })
      const beforeTopology = svc.getTopology(created.meta.dungeonId)
      const beforeCell = svc.getCell({ dungeonId: created.meta.dungeonId, floorIndex: 0, x: 5, y: 5 })
      const file = readMeta(dataRoot, created.meta.dungeonId)
      writeMeta(dataRoot, created.meta.dungeonId, {
        ...file,
        overlays: [{ floorIndex: 0, x: 5, y: 5, key: 'visited', value: 'true' }]
      })

      expect(svc.resetDungeonInstance(created.meta.dungeonId).overlays).toEqual([])
      expect(svc.resetDungeonInstance(created.meta.dungeonId).overlays).toEqual([])
      expect(readMeta(dataRoot, created.meta.dungeonId).overlays).toEqual([])
      expect(svc.getDungeonMeta(created.meta.dungeonId).seed).toBe(13)
      expect(svc.getTopology(created.meta.dungeonId)).toEqual(beforeTopology)
      expect(svc.getCell({ dungeonId: created.meta.dungeonId, floorIndex: 0, x: 5, y: 5 })).toEqual(beforeCell)
    })
  })
})

describe('dungeonService restock lifecycle', () => {
  it('restocks by clearing restockable overlays and invoking the injected hook', () => {
    const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-dungeon-'))
    try {
      const restocked = { floorIndex: 0, x: 6, y: 6, key: 'restock:enemy', value: 'goblin' }
      const calls: string[] = []
      const svc = createDungeonService(dataRoot, {
        restock: (context) => {
          calls.push(context.meta.dungeonId)
          return [restocked]
        }
      })
      const created = svc.createDungeon({ dungeonId: 'restockable', seed: 17, floorCount: 1, width: 24, height: 20 })
      const file = readMeta(dataRoot, created.meta.dungeonId)
      writeMeta(dataRoot, created.meta.dungeonId, {
        ...file,
        overlays: [
          { floorIndex: 0, x: 1, y: 1, key: 'note', value: 'keep' },
          { floorIndex: 0, x: 2, y: 2, key: 'restock:enemy', value: 'old' }
        ]
      })

      expect(svc.restockDungeonInstance(created.meta.dungeonId).overlays).toEqual([
        { floorIndex: 0, x: 1, y: 1, key: 'note', value: 'keep' },
        restocked
      ])
      expect(calls).toEqual(['restockable'])
    } finally {
      rmSync(dataRoot, { recursive: true, force: true })
    }
  })
})
