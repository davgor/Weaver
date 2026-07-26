import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { dungeonEngine } from './index.js'

const temps: string[] = []

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-dungeon-ep-'))
  temps.push(root)
  return root
}

afterEach(() => {
  while (temps.length > 0) {
    const root = temps.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

async function createEp1Dungeon(dataRoot: string): Promise<void> {
  const created = (await dungeonEngine.call('createDungeon', {
    dataRoot,
    dungeonId: 'ep1',
    seed: 7,
    floorCount: 1,
    width: 16,
    height: 16,
    theme: 'crypt'
  })) as { meta: { dungeonId: string } }
  expect(created.meta.dungeonId).toBe('ep1')
}

describe('dungeon call() create and meta', () => {
  it('creates a dungeon and exposes list/meta/has queries', async () => {
    const dataRoot = tempRoot()
    await createEp1Dungeon(dataRoot)

    expect(await dungeonEngine.call('hasDungeon', { dataRoot, dungeonId: 'ep1' })).toBe(true)
    expect(await dungeonEngine.call('listDungeons', { dataRoot })).toEqual(['ep1'])
    expect(await dungeonEngine.call('getDungeonMeta', { dataRoot, dungeonId: 'ep1' })).toMatchObject({
      dungeonId: 'ep1',
      seed: 7
    })
    expect(await dungeonEngine.call('getDungeonBounds', { dataRoot, dungeonId: 'ep1' })).toMatchObject({
      minX: 0,
      minY: 0
    })
    expect(await dungeonEngine.call('listFloors', { dataRoot, dungeonId: 'ep1' })).toHaveLength(1)
  })
})

describe('dungeon call() cell and floor reads', () => {
  it('reads cells, regions, floors, and the whole dungeon', async () => {
    const dataRoot = tempRoot()
    await createEp1Dungeon(dataRoot)

    expect(
      await dungeonEngine.call('getCell', { dataRoot, dungeonId: 'ep1', floorIndex: 0, x: 0, y: 0 })
    ).toBeTruthy()
    expect(
      await dungeonEngine.call('getDungeonSpecific', {
        dataRoot,
        dungeonId: 'ep1',
        floorIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 }
      })
    ).toHaveLength(4)
    expect(
      await dungeonEngine.call('getFloor', { dataRoot, dungeonId: 'ep1', floorIndex: 0 })
    ).toHaveLength(256)
    expect(await dungeonEngine.call('getDungeonWhole', { dataRoot, dungeonId: 'ep1' })).toHaveLength(256)
  })
})

describe('dungeon call() delete', () => {
  it('deletes a dungeon and clears hasDungeon', async () => {
    const dataRoot = tempRoot()
    await createEp1Dungeon(dataRoot)

    expect(await dungeonEngine.call('deleteDungeon', { dataRoot, dungeonId: 'ep1' })).toEqual({
      ok: true
    })
    expect(await dungeonEngine.call('hasDungeon', { dataRoot, dungeonId: 'ep1' })).toBe(false)
  })
})

describe('dungeon call() validation', () => {
  it('rejects invalid payloads on create and query endpoints', async () => {
    const dataRoot = tempRoot()
    await expect(dungeonEngine.call('createDungeon', null)).rejects.toThrow(/payload object required/)
    await expect(dungeonEngine.call('createDungeon', {})).rejects.toThrow(/dataRoot required/)
    await expect(
      dungeonEngine.call('createDungeon', { dataRoot, seed: 'nope' })
    ).rejects.toThrow(/seed must be a number/)
    await expect(
      dungeonEngine.call('hasDungeon', { dataRoot, dungeonId: '' })
    ).rejects.toThrow(/dungeonId required/)
    await expect(
      dungeonEngine.call('getDungeonSpecific', {
        dataRoot,
        dungeonId: 'missing',
        floorIndex: 0
      })
    ).rejects.toThrow(/bounds required/)
  })
})

describe('dungeonEngine typed API', () => {
  it('mirrors create, query, and delete through convenience methods', () => {
    const dataRoot = tempRoot()
    const { meta } = dungeonEngine.createDungeon(dataRoot, {
      dungeonId: 'api1',
      seed: 3,
      floorCount: 1,
      width: 16,
      height: 16
    })
    expect(dungeonEngine.hasDungeon(dataRoot, meta.dungeonId)).toBe(true)
    expect(dungeonEngine.listDungeons(dataRoot)).toEqual(['api1'])
    expect(dungeonEngine.getDungeonMeta(dataRoot, meta.dungeonId).seed).toBe(3)
    expect(dungeonEngine.getDungeonBounds(dataRoot, meta.dungeonId).maxX).toBeGreaterThan(0)
    expect(dungeonEngine.listFloors(dataRoot, meta.dungeonId)).toHaveLength(1)
    expect(
      dungeonEngine.getCell({ dataRoot, dungeonId: meta.dungeonId, floorIndex: 0, x: 0, y: 0 })
    ).toBeTruthy()
    expect(
      dungeonEngine.getDungeonSpecific({
        dataRoot,
        dungeonId: meta.dungeonId,
        floorIndex: 0,
        bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }
      })
    ).toHaveLength(1)
    expect(dungeonEngine.getFloor(dataRoot, meta.dungeonId, 0)).toHaveLength(256)
    expect(dungeonEngine.getDungeonWhole(dataRoot, meta.dungeonId)).toHaveLength(256)
    dungeonEngine.deleteDungeon(dataRoot, meta.dungeonId)
    expect(dungeonEngine.hasDungeon(dataRoot, meta.dungeonId)).toBe(false)
  })
})
