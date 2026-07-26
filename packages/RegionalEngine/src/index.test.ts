import { describe, expect, it } from 'vitest'
import { createRegionalService, regionalEngine } from './index.js'

describe('@weaver/regional-engine', () => {
  it('reports healthy', () => {
    const health = regionalEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/regional-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = regionalEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
    expect(endpoints.map((entry) => entry.name)).toEqual(
      expect.arrayContaining([
        'findNewRegion',
        'createRegion',
        'fillRegions',
        'getRegion',
        'listRegions',
        'getRegionAt',
        'getRegionsInBounds',
        'getRegionCells',
        'getRegionSummary',
        'clearRegions',
        'deleteRegion',
        'hasRegions',
        'countRegions'
      ])
    )
  })

  it('invokes the health endpoint', async () => {
    const result = await regionalEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/regional-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await regionalEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/regional-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(regionalEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('exports a dependency-injected RegionalService factory', () => {
    expect(createRegionalService).toBeTypeOf('function')
  })
})
