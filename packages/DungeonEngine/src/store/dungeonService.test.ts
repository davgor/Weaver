import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createDungeonService } from './dungeonService.js'

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
