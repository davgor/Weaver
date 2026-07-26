import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { worldEngine } from './index.js'

async function withTempRoot(run: (dataRoot: string) => Promise<void> | void): Promise<void> {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-world-api-'))
  try {
    await run(dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

describe('@weaver/world-engine', () => {
  it('reports healthy', () => {
    const health = worldEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/world-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = worldEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await worldEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/world-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await worldEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/world-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(worldEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})

describe('@weaver/world-engine world APIs', () => {
  it('exposes typed create, expand, query, and lifecycle methods', async () => {
    await withTempRoot((dataRoot) => {
      const created = worldEngine.createWorld(dataRoot, { worldId: 'api-world', seed: 17, width: 4, height: 4 })
      expect(created.expansion0.sequence).toBe(0)
      expect(worldEngine.hasWorld(dataRoot, 'api-world')).toBe(true)
      const expansion = worldEngine.expandWorld(dataRoot, {
        worldId: 'api-world',
        bounds: { minX: 0, minY: 0, maxX: 5, maxY: 3 }
      })
      expect(worldEngine.getExpansion(dataRoot, 'api-world', expansion.expansionId)).toEqual(expansion)
      expect(worldEngine.getWorldSpecific({ dataRoot, worldId: 'api-world', bounds: expansion.addedBounds })).toHaveLength(8)
      expect(Array.isArray(worldEngine.getWorldWhole(dataRoot, 'api-world'))).toBe(false)
      expect(worldEngine.getCell({ dataRoot, worldId: 'api-world', x: 0, y: 0 })).toBeTruthy()
      worldEngine.deleteWorld(dataRoot, 'api-world')
      expect(worldEngine.listWorlds(dataRoot)).toEqual([])
    })
  })

  it('exposes admin-callable endpoints that require dataRoot payloads', async () => {
    await withTempRoot(async (dataRoot) => {
      const endpoints = worldEngine.listEndpoints().map((endpoint) => endpoint.name)
      expect(endpoints).toEqual(
        expect.arrayContaining([
          'createWorld',
          'expandWorld',
          'getCell',
          'getWorldSpecific',
          'getWorldWhole',
          'getWorldBounds',
          'getWorldMeta',
          'getExpansion',
          'listExpansions',
          'getLatestExpansion',
          'listWorlds',
          'deleteWorld',
          'hasWorld'
        ])
      )
      const created = await worldEngine.call('createWorld', { dataRoot, worldId: 'endpoint-world', seed: 21, width: 3, height: 3 })
      expect(created).toMatchObject({ meta: { worldId: 'endpoint-world' }, expansion0: { sequence: 0 } })
      const cell = await worldEngine.call('getCell', { dataRoot, worldId: 'endpoint-world', x: 1, y: 1 })
      expect(cell).toMatchObject({ x: 1, y: 1 })
      await expect(worldEngine.call('listWorlds')).rejects.toThrow(/payload object required/)
    })
  })
})
