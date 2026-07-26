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
        endpoints: expect.arrayContaining([
          { name: 'health', description: 'Return package health metadata' },
          { name: 'getCatalog', description: 'Return a deterministic fresh seed catalog' },
          {
            name: 'listCatalogActions',
            description: 'List deterministic seed catalog actions'
          },
          {
            name: 'grantKnownAction',
            description: 'Grant a known catalog action id to a character'
          }
        ])
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
