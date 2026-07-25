import { describe, expect, it } from 'vitest'
import { npcEngine } from './index.js'

describe('@weaver/npc-engine', () => {
  it('reports healthy', () => {
    const health = npcEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/npc-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = npcEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await npcEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/npc-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await npcEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/npc-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(npcEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
