import { describe, expect, it } from 'vitest'
import { itemEngine } from './index.js'

describe('@weaver/item-engine', () => {
  it('reports healthy', () => {
    const health = itemEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/item-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = itemEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await itemEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/item-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await itemEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/item-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(itemEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
