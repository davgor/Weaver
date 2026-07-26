import { describe, expect, it } from 'vitest'
import { weatherEngine } from './index.js'

describe('@weaver/weather-engine', () => {
  it('reports healthy', () => {
    const health = weatherEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/weather-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = weatherEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await weatherEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/weather-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await weatherEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/weather-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(weatherEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
