import { describe, expect, it } from 'vitest'
import { dungeonEngine } from './index.js'

describe('@weaver/dungeon-engine', () => {
  it('reports healthy', () => {
    const health = dungeonEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/dungeon-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = dungeonEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await dungeonEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/dungeon-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await dungeonEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/dungeon-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(dungeonEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
