import { describe, expect, it } from 'vitest'
import { civilizationEngine } from './index.js'

describe('@weaver/civilization-engine', () => {
  it('reports healthy', () => {
    const health = civilizationEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/civilization-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = civilizationEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await civilizationEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/civilization-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await civilizationEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/civilization-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(civilizationEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
