import { describe, expect, it } from 'vitest'
import { actionEngine } from '@weaver/action-engine'
import { buildCatalog, dispatchEngineCall } from './engineDispatch.js'

describe('ElectronAdmin ActionEngine contract', () => {
  it('catalogs the real ActionEngine published API', () => {
    const catalog = buildCatalog([actionEngine])

    expect(catalog).toEqual([
      {
        id: 'ActionEngine',
        title: 'Action Engine',
        description: 'Deterministic abilities, effects, ranges, and Action-turn costs',
        endpoints: [{ name: 'health', description: 'Return package health metadata' }]
      }
    ])
  })

  it('dispatches to the real ActionEngine health endpoint', async () => {
    const result = await dispatchEngineCall([actionEngine], 'ActionEngine', 'health')

    expect(result.engineId).toBe('ActionEngine')
    expect(result.endpoint).toBe('health')
    expect(result.result).toMatchObject({ ok: true, package: '@weaver/action-engine' })
  })
})
