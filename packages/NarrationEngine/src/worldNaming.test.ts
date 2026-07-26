import { describe, expect, it } from 'vitest'
import type { TextCompleter } from './peers.js'
import {
  realizePantheon,
  realizePlaceNaming,
  sealPlaceNaming,
  type RegionPlaceStats,
  type SettlementPlaceStats
} from './worldNaming.js'

describe('realizePlaceNaming region', () => {
  it('invents and validates region display name and history against landlocked stats', async () => {
    const stats: RegionPlaceStats = {
      dominantLandType: 'grassland',
      isOcean: false,
      isLandlocked: true,
      touchesOcean: false,
      waterContent: 0.05
    }
    const completer = scriptedCompleter([
      JSON.stringify({
        displayName: 'Harbor Reach',
        history: 'A busy port where traders gather.'
      }),
      JSON.stringify({
        displayName: 'Greenfold Vale',
        history: 'Rolling grasslands sheltered between low hills.'
      })
    ])

    const outcome = await realizePlaceNaming(
      { kind: 'region', stats, campaignId: 'camp-1', seed: 'region-a' },
      completer
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.naming.displayName).toBe('Greenfold Vale')
    expect(outcome.naming.history).toContain('grasslands')
    expect(sealPlaceNaming(outcome.naming)).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('realizePlaceNaming existing label', () => {
  it('rejects names that contradict an existing display label', async () => {
    const stats: RegionPlaceStats = {
      dominantLandType: 'forest',
      isOcean: false,
      isLandlocked: true,
      touchesOcean: false,
      waterContent: 0.1,
      existingDisplayName: 'Ironwood Thicket'
    }
    const completer = scriptedCompleter([
      JSON.stringify({
        displayName: 'Sunset Bay',
        history: 'A calm harbor on the southern shore.'
      }),
      JSON.stringify({
        displayName: 'Ironwood Thicket',
        history: 'Ancient trees knit the hills in shadow.'
      })
    ])

    const outcome = await realizePlaceNaming(
      { kind: 'region', stats, campaignId: 'camp-1' },
      completer
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.naming.displayName).toBe('Ironwood Thicket')
  })
})

describe('realizePlaceNaming settlement', () => {
  it('validates settlement naming against region coastal facts', async () => {
    const stats: SettlementPlaceStats = {
      settlementKind: 'village',
      population: 420,
      regionIsLandlocked: true,
      regionTouchesOcean: false
    }
    const completer = scriptedCompleter([
      JSON.stringify({
        displayName: 'Dockside Hamlet',
        history: 'Fisherfolk haul nets beside the wharves.'
      }),
      JSON.stringify({
        displayName: 'Millbrook',
        history: 'Farmers trade grain along a quiet brook.'
      })
    ])

    const outcome = await realizePlaceNaming(
      { kind: 'settlement', stats, campaignId: 'camp-2' },
      completer
    )

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.naming.displayName).toBe('Millbrook')
  })
})

describe('realizePantheon', () => {
  it('returns campaign-scoped deities with validated names and guarded domains', async () => {
    const completer = scriptedCompleter([
      JSON.stringify({
        deities: [
          { name: 'Storm-Bringer', domain: 'thunder and war' },
          { name: 'Liora the Gentle', domain: 'healing and dawn' }
        ]
      }),
      JSON.stringify({
        deities: [
          { name: 'Liora the Gentle', domain: 'healing and dawn' },
          { name: 'Bran the Steadfast', domain: 'oaths and stone' }
        ]
      })
    ])

    const outcome = await realizePantheon({ campaignId: 'camp-3', count: 2 }, completer)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.pantheon.deities).toHaveLength(2)
    expect(outcome.pantheon.deities[0]?.name).toBe('Liora the Gentle')
    expect(outcome.pantheon.deities[1]?.name).toBe('Bran the Steadfast')
    expect(outcome.pantheon.deities.every((d) => d.domain.length > 0)).toBe(true)
  })

  it('applies terminology guards to deity domains', async () => {
    const completer = scriptedCompleter([
      JSON.stringify({
        deities: [{ name: 'Mira of the Hearth', domain: 'hearth and saving throws' }]
      }),
      JSON.stringify({
        deities: [{ name: 'Mira of the Hearth', domain: 'hearth and refuge' }]
      })
    ])

    const outcome = await realizePantheon({ campaignId: 'camp-4', count: 1 }, completer)

    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.pantheon.deities[0]?.domain).not.toMatch(/saving throw/i)
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
