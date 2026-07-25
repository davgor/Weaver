import { describe, expect, it } from 'vitest'
import { enemyEngine } from './index.js'

describe('@weaver/enemy-engine', () => {
  it('reports healthy', () => {
    const health = enemyEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/enemy-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = enemyEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await enemyEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/enemy-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await enemyEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/enemy-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(enemyEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
