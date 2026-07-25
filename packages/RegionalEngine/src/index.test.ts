import { describe, expect, it } from 'vitest'
import { regionalEngine } from './index.js'

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
})
