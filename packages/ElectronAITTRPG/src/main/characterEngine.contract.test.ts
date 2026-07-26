import { describe, expect, it } from 'vitest'
import { characterEngine, getAbilityModifier } from '@weaver/character-engine'
import { buildStartupBoot } from './engineCatalog.js'

describe('ElectronAITTRPG CharacterEngine contract', () => {
  it('uses the real CharacterEngine id expected by startup health', () => {
    expect(characterEngine.id).toBe('CharacterEngine')
    expect(getAbilityModifier(12)).toBe(1)
  })

  it('reports startup ready with CharacterEngine in the real catalog', () => {
    expect(buildStartupBoot()).toMatchObject({
      phase: 'ready',
      engineLabel: 'Weaver engines ready',
      failureMessage: null
    })
  })
})
