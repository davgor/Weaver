import { describe, expect, it } from 'vitest'
import { questEngine } from './index.js'

describe('@weaver/quest-engine', () => {
  it('reports healthy', () => {
    const health = questEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/quest-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = questEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.map((endpoint) => endpoint.name)).toEqual(
      expect.arrayContaining([
        'health',
        'seedWorldQuests',
        'listWorldQuests',
        'getWorldQuest',
        'defineQuestTemplate'
      ])
    )
  })

  it('invokes the health endpoint', async () => {
    const result = await questEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/quest-engine' })
  })

  it('accepts an optional payload without breaking health', async () => {
    const result = await questEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/quest-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(questEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})
