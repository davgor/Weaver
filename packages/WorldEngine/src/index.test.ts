import { describe, expect, it } from 'vitest'
import { worldEngine } from './index.js'

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
