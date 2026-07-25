import { describe, expect, it } from 'vitest'
import { dmEngine } from './index.js'

describe('@weaver/dm-engine', () => {
  it('reports healthy', () => {
    const health = dmEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/dm-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = dmEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await dmEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/dm-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await dmEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/dm-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(dmEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
