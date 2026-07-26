import { describe, expect, it } from 'vitest'
import { combatEngine } from './index.js'

describe('@weaver/combat-engine', () => {
  it('reports healthy', () => {
    const health = combatEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/combat-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = combatEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await combatEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/combat-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await combatEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/combat-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(combatEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('rejects non-object payloads for typed encounter endpoints', async () => {
    await expect(combatEngine.call('encounter.start', null)).rejects.toThrow(/payload must be an object/i)
    await expect(combatEngine.call('encounter.get', 'bad')).rejects.toThrow(/payload must be an object/i)
  })

  it('lists lifecycle and resolution encounter endpoints', () => {
    const names = combatEngine.listEndpoints().map((endpoint) => endpoint.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'encounter.start',
        'encounter.startAdHoc',
        'encounter.attack',
        'encounter.flee',
        'encounter.execute'
      ])
    )
  })
})
