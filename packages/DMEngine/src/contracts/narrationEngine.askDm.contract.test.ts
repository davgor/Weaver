import { describe, expect, it } from 'vitest'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import { assembleAskDmContext } from '../askDm/assembleAskDmContext.js'

describe('DMEngine -> NarrationEngine ask-the-DM contract', () => {
  it('fills an OOC answer skeleton grounded in campaign and character facts', async () => {
    const facts = assembleAskDmContext({
      campaignId: 'contract-campaign',
      characterId: 'pc-contract',
      campaignFacts: { setting: 'moon roads' },
      characterFacts: { race: 'elf', archetype: 'ranger' }
    })

    const result = await fillAndValidate(
      {
        skeleton: '{{ANSWER}}',
        facts,
        stage: askDmStage('Can elves see in the dark?'),
        seed: 'ask-dm-contract'
      },
      scriptedCompleter(`
<<<ANSWER>>>
Race: elf. Archetype: ranger. Elves have darkvision out to 60 feet in moon roads.
<<</ANSWER>>>
`)
    )

    expect(result.ok).toBe(true)
    expect(result.filled.ANSWER).toContain('elf')
    expect(result.filled.ANSWER).toContain('ranger')
    expect(result.filled.ANSWER).toContain('darkvision')
  })

  it('rejects contradictory OOC answers against supplied facts', async () => {
    const result = await fillAndValidate(
      {
        skeleton: '{{ANSWER}}',
        facts: { race: 'elf', archetype: 'ranger' },
        stage: askDmStage('What is my race?'),
        seed: 'ask-dm-contract-reject'
      },
      scriptedCompleter(`
<<<ANSWER>>>
Race: dwarf. Archetype: ranger. You are a stout dwarf.
<<</ANSWER>>>
`)
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining(['Block ANSWER contradicts fact race=elf'])
    )
  })
})

function askDmStage(question: string): string {
  return [
    'askDm.answer',
    'Answer an out-of-character rules or lore question without changing game state.',
    `Question: ${question}`
  ].join('\n')
}

function scriptedCompleter(text: string): TextCompleter {
  return {
    completeText: async () => ({ text, backend: 'contract' })
  }
}
