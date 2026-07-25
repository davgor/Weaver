import { describe, expect, it } from 'vitest'
import { narrationEngine } from './index.js'

describe('@weaver/narration-engine', () => {
  it('reports healthy', () => {
    const health = narrationEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/narration-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = narrationEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await narrationEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/narration-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await narrationEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/narration-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(narrationEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
