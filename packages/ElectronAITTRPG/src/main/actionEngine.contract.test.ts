import { describe, expect, it } from 'vitest'
import { actionEngine, isValidRange } from '@weaver/action-engine'
import { buildStartupBoot } from './engineCatalog.js'

describe('ElectronAITTRPG ActionEngine contract', () => {
  it('uses the real ActionEngine id expected by startup health', () => {
    expect(actionEngine.id).toBe('ActionEngine')
    expect(isValidRange({ kind: 'meleeWeapon' })).toBe(true)
  })

  it('reports startup ready with ActionEngine in the real catalog', () => {
    expect(buildStartupBoot()).toMatchObject({
      phase: 'ready',
      engineLabel: 'Weaver engines ready',
      failureMessage: null
    })
  })
})
