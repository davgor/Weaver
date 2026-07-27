import { describe, expect, it } from 'vitest'
import type { TextCompleter } from '@weaver/narration-engine'
import { generateVnChoicePair } from './generateVnChoicePair.js'

describe('generateVnChoicePair', () => {
  it('returns two personality-grounded options from a scripted completer', async () => {
    const result = await generateVnChoicePair(
      {
        personality: 'quiet but stubborn',
        beatText: 'Fog rolls over the dock as the last lantern dies.',
        appearance: 'salt-stained coat',
        seed: 'choice-1'
      },
      scriptedCompleter()
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.options).toEqual([
      'Search the fog for the thief.',
      'Ask the harbor warden what they saw.'
    ])
  })

  it('fails when labeled blocks are missing', async () => {
    const result = await generateVnChoicePair(
      { personality: 'stubborn', beatText: 'Fog' },
      { completeText: async () => ({ text: 'no blocks', backend: 'test' }) }
    )
    expect(result.ok).toBe(false)
  })
})

function scriptedCompleter(): TextCompleter {
  return {
    async completeText() {
      return {
        backend: 'test',
        text: [
          '<<<OPTION_A>>>Search the fog for the thief.<<</OPTION_A>>>',
          '<<<OPTION_B>>>Ask the harbor warden what they saw.<<</OPTION_B>>>'
        ].join('\n')
      }
    }
  }
}
