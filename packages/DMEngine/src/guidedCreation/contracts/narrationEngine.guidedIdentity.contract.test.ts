import { describe, expect, it } from 'vitest'
import {
  fillAndValidate,
  generateGuidedIdentityReply,
  type TextCompleter
} from '@weaver/narration-engine'

describe('NarrationEngine guided identity contract', () => {
  it('provides fact-grounded guided identity replies DMEngine can orchestrate', async () => {
    const result = await generateGuidedIdentityReply(
      {
        phase: 'who',
        transcript: ['Player: Who am I?'],
        characterFacts: facts(),
        seed: 'dm-guided-contract'
      },
      scriptedCompleter(`
<<<REPLY>>>
Race: elf. Background: outlander. Archetype: ranger. I am Ilyra of the pines.
<<</REPLY>>>
`)
    )

    expect(result).toEqual({
      ok: true,
      prose: 'Race: elf. Background: outlander. Archetype: ranger. I am Ilyra of the pines.',
      errors: []
    })
  })

  it('fills an opening scene skeleton while preserving supplied identity facts', async () => {
    const result = await fillAndValidate(
      {
        skeleton: '{{OPENING_SCENE}}',
        facts: facts(),
        stage: 'guidedIdentity.openingScene',
        seed: 'opening-contract'
      },
      scriptedCompleter(`
<<<OPENING_SCENE>>>
Race: elf. Background: outlander. Archetype: ranger. Mist lifts from the first road.
<<</OPENING_SCENE>>>
`)
    )

    expect(result.ok).toBe(true)
    expect(result.filled.OPENING_SCENE).toContain('elf')
    expect(result.filled.OPENING_SCENE).toContain('outlander')
    expect(result.filled.OPENING_SCENE).toContain('ranger')
  })
})

function facts(): Record<string, string> {
  return {
    race: 'elf',
    background: 'outlander',
    archetype: 'ranger',
    gear: 'longbow, bedroll',
    companions: 'Lyra the ranger'
  }
}

function scriptedCompleter(text: string): TextCompleter {
  return {
    completeText: async () => ({ text, backend: 'scripted' })
  }
}
