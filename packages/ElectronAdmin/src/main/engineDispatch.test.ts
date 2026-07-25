import { describe, expect, it } from 'vitest'
import { buildCatalog, dispatchEngineCall, type DispatchableEngine } from './engineDispatch.js'

function fakeEngine(overrides: Partial<DispatchableEngine> = {}): DispatchableEngine {
  return {
    id: 'FakeEngine',
    title: 'Fake Engine',
    description: 'A fake engine for tests',
    listEndpoints: () => [{ name: 'health', description: 'Health check' }],
    call: async () => ({ ok: true }),
    ...overrides
  }
}

describe('buildCatalog', () => {
  it('summarizes each engine without exposing invoke internals', () => {
    const summary = buildCatalog([fakeEngine()])
    expect(summary).toEqual([
      {
        id: 'FakeEngine',
        title: 'Fake Engine',
        description: 'A fake engine for tests',
        endpoints: [{ name: 'health', description: 'Health check' }]
      }
    ])
  })
})

describe('dispatchEngineCall', () => {
  it('threads the payload through to the matched engine.call', async () => {
    let received: unknown
    const engine = fakeEngine({
      call: async (_endpoint, payload) => {
        received = payload
        return { echoed: payload }
      }
    })
    const payload = { rollFor: 'ability-check', dc: 15 }
    const result = await dispatchEngineCall([engine], 'FakeEngine', 'rollCheck', payload)

    expect(received).toEqual(payload)
    expect(result.result).toEqual({ echoed: payload })
    expect(result.payload).toEqual(payload)
    expect(result.engineId).toBe('FakeEngine')
    expect(result.endpoint).toBe('rollCheck')
    expect(typeof result.durationMs).toBe('number')
  })

  it('works with no payload (undefined)', async () => {
    const result = await dispatchEngineCall([fakeEngine()], 'FakeEngine', 'health')
    expect(result.result).toEqual({ ok: true })
    expect(result.payload).toBeUndefined()
  })

  it('throws for an unknown engine id', async () => {
    await expect(
      dispatchEngineCall([fakeEngine()], 'DoesNotExist', 'health')
    ).rejects.toThrow(/Unknown engine/)
  })
})
