import { describe, expect, it } from 'vitest'
import { actionEngine, isValidRange } from '@weaver/action-engine'
import { dmEngine } from '@weaver/dm-engine'
import { llmEngine } from '@weaver/llm-engine'
import { narrationEngine } from '@weaver/narration-engine'
import { buildStartupBoot } from './engineCatalog.js'

describe('ElectronAIVN engine catalog contract', () => {
  it('uses real ActionEngine id expected by startup health', () => {
    expect(actionEngine.id).toBe('ActionEngine')
    expect(isValidRange({ kind: 'meleeWeapon' })).toBe(true)
  })

  it('pins DMEngine, NarrationEngine, and LLMEngine presence for VN clients', () => {
    expect(dmEngine.id).toBe('DMEngine')
    expect(narrationEngine.id).toBe('NarrationEngine')
    expect(llmEngine.id).toBe('LLMEngine')
  })

  it('reports startup ready with the real engine catalog', () => {
    expect(buildStartupBoot()).toMatchObject({
      phase: 'ready',
      engineLabel: 'Weaver engines ready',
      failureMessage: null
    })
  })
})
