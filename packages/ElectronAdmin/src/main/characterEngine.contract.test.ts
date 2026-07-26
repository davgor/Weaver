import { describe, expect, it } from 'vitest'
import { characterEngine } from '@weaver/character-engine'
import { buildCatalog, dispatchEngineCall } from './engineDispatch.js'

describe('ElectronAdmin CharacterEngine contract', () => {
  it('catalogs the real CharacterEngine published API', () => {
    const catalog = buildCatalog([characterEngine])

    expect(catalog).toEqual([
      {
        id: 'CharacterEngine',
        title: 'Character Engine',
        description: 'Deterministic player-character ability and resolution model',
        endpoints: expect.arrayContaining([
          { name: 'health', description: 'Return package health metadata' },
          {
            name: 'resolveAbilityCheck',
            description: 'Resolve d20 + ability modifier + optional proficiency vs target'
          }
        ])
      }
    ])
  })

  it('dispatches to the real CharacterEngine health endpoint', async () => {
    const result = await dispatchEngineCall([characterEngine], 'CharacterEngine', 'health')

    expect(result.engineId).toBe('CharacterEngine')
    expect(result.endpoint).toBe('health')
    expect(result.result).toMatchObject({ ok: true, package: '@weaver/character-engine' })
  })
})
