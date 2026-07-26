import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryEncounterStore, getEncounter, startEncounter, submitCombatAction } from '@weaver/combat-engine'
import { clearNarrationStore, type TextCompleter } from '@weaver/narration-engine'
import { resolveTurn, type ResolveTurnDeps } from '@weaver/dm-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'

describe('ElectronAITTRPG contract: DMEngine turn routing APIs', () => {
  beforeEach(() => {
    clearNarrationStore()
  })

  it('resolves a free-text play turn into scene/social projections without using ask-DM channel', async () => {
    const result = await resolveTurn(
      { channel: 'play', campaignId: 'camp-turn', characterId: 'pc-turn', text: 'look around' },
      deps()
    )

    expect(result.route).toBe('narration')
    expect(result.projections.scene[0]?.text).toBe('The room brightens.')
  })

  it('keeps active combat actions in the combat route', async () => {
    const store = createMemoryEncounterStore()
    startEncounter(
      {
        encounterId: 'enc-contract',
        store,
        combatants: [
          { id: 'pc-turn', kind: 'character', abilityScores: scores() },
          { id: 'enemy-1', kind: 'enemy', abilityScores: scores() }
        ]
      },
      { roller: () => 10 }
    )

    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-turn',
        characterId: 'pc-turn',
        text: 'attack with my blade',
        encounterId: 'enc-contract',
        combatAction: 'Slash'
      },
      deps({
        combat: {
          getEncounter: (encounterId) => getEncounter({ encounterId, store }),
          submitCombatAction: (input) => submitCombatAction({ ...input, store })
        }
      })
    )

    expect(result.route).toBe('combat')
    expect(result.resolution).toMatchObject({ kind: 'combat' })
  })
})

function deps(overrides: Partial<ResolveTurnDeps> = {}): ResolveTurnDeps {
  const currency = createCurrencyService()
  return {
    completer: routeCompleter(),
    currency: {
      credit: (characterId, amount) => currency.credit(characterId, amount),
      debit: (characterId, amount) => currency.debit(characterId, amount),
      getBalance: (characterId) => currency.getBalance(characterId),
      clampProposedPrice
    },
    travel: { advanceTravelDays: (campaignId, days) => ({ campaignId, advancedDays: days, day: days }) },
    destinations: { isGenerated: () => true },
    narration: {
      llm: proseCompleter(),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: { getEncounter: () => undefined, submitCombatAction: () => missingCombat() },
    persist: () => undefined,
    ...overrides
  }
}

function routeCompleter(): TextCompleter {
  return { completeText: async () => ({ text: '{"intent":"look","route":"narration"}', backend: 'test' }) }
}

function proseCompleter(): TextCompleter {
  return { completeText: async () => ({ text: 'The room brightens.\n<<<CLAIMS\n>>>', backend: 'test' }) }
}

function scores() {
  return { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
}

function missingCombat(): never {
  throw new Error('combat should not run')
}
