import { describe, expect, it } from 'vitest'
import {
  realizePantheon,
  realizePlaceNaming,
  sealPlaceNaming,
  type TextCompleter
} from '@weaver/narration-engine'

describe('DMEngine -> NarrationEngine world naming contract (060)', () => {
  it('invents validated region naming against real NarrationEngine APIs', async () => {
    const completer = scriptedCompleter([
      JSON.stringify({
        displayName: 'Dockside Reach',
        history: 'Traders gather beside the wharves.'
      }),
      JSON.stringify({
        displayName: 'Greenfold',
        history: 'Grasslands roll between low hills.'
      })
    ])

    const outcome = await realizePlaceNaming(
      {
        kind: 'region',
        campaignId: 'contract-camp',
        stats: {
          dominantLandType: 'grassland',
          isOcean: false,
          isLandlocked: true,
          touchesOcean: false,
          waterContent: 0.05
        }
      },
      completer
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.naming.displayName).toBe('Greenfold')
    expect(sealPlaceNaming(outcome.naming)).toMatch(/^[a-f0-9]{64}$/)
  })

  it('invents pantheon deities through real NarrationEngine APIs', async () => {
    const completer = scriptedCompleter([
      JSON.stringify({
        deities: [{ name: 'Liora the Gentle', domain: 'healing and dawn' }]
      })
    ])

    const outcome = await realizePantheon(
      { campaignId: 'contract-camp', count: 1 },
      completer
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.pantheon.deities[0]?.name).toBe('Liora the Gentle')
  })
})

function scriptedCompleter(responses: string[]): TextCompleter {
  let index = 0
  return {
    async completeText() {
      const text = responses[index] ?? responses[responses.length - 1] ?? '{}'
      index += 1
      return { text, backend: 'test' }
    }
  }
}
