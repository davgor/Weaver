import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCharacterStatsStore,
  clearStartingLoadoutStore,
  persistCharacterMaxHp,
  requestInactiveProxyAction,
  selectStartingLoadout
} from '@weaver/character-engine'
import { clearNarrationStore, type TextCompleter } from '@weaver/narration-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import { createMemoryEncounterStore } from '@weaver/combat-engine'
import { requestInactivePcProxyTurn } from '../requestInactivePcProxyTurn.js'
import { createStoreCombatTurnApi } from '../../turnRouting/combatApi.js'
import { resolveTurn } from '../../turnRouting/resolveTurn.js'
import type { ResolveTurnDeps } from '../../turnRouting/types.js'

beforeEach(() => {
  clearNarrationStore()
  clearStartingLoadoutStore()
  clearCharacterStatsStore()
})

describe('DMEngine -> CharacterEngine inactive-proxy contract', () => {
  it('grounds proxy suggestions and resolves an isolated narration turn', async () => {
    const characterId = 'pc-contract-inactive'
    selectStartingLoadout(characterId, 'Mage')
    persistCharacterMaxHp({ characterId, hitDie: 6, level: 1, bodyMod: 0 })

    const result = await requestInactivePcProxyTurn(
      {
        campaignId: 'camp-contract-proxy',
        characterId,
        activeCharacterId: 'pc-contract-active',
        intentTag: 'arcane'
      },
      {
        characters: { requestInactiveProxyAction },
        resolveTurn,
        turnDeps: contractTurnDeps()
      }
    )

    expect(result.suggestion).toMatchObject({
      characterId,
      groundedIn: 'archetype_kit',
      kitTag: 'arcane',
      actionId: null
    })
    expect(result.turn.route).toBe('narration')
    expect(result.turn.narration.status).toBe('persisted')
    expect(result.turn.projections.social.length).toBeGreaterThan(0)
  })
})

function contractTurnDeps(): ResolveTurnDeps {
  const store = createMemoryEncounterStore()
  const currency = createCurrencyService()
  return {
    completer: routeCompleter(),
    currency: {
      credit: (characterId, amount) => currency.credit(characterId, amount),
      debit: (characterId, amount) => currency.debit(characterId, amount),
      getBalance: (characterId) => currency.getBalance(characterId),
      clampProposedPrice
    },
    travel: {
      advanceTravelDays: (campaignId, days) => ({ campaignId, advancedDays: days, day: days }),
      setCharacterLocation: (input) => ({
        characterId: input.characterId,
        campaignId: input.campaignId,
        regionId: input.regionId,
        locationKind: input.locationKind,
        ...(input.placeId === undefined ? {} : { placeId: input.placeId }),
        ...(input.updatedDay === undefined ? {} : { updatedDay: input.updatedDay })
      })
    },
    destinations: {
      isGenerated: () => true,
      resolvePlacement: () => ({
        regionId: 'opaque-region-inactive-contract',
        locationKind: 'overworld'
      })
    },
    narration: {
      llm: proseCompleter(),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: createStoreCombatTurnApi(store),
    persist: () => undefined
  }
}

function routeCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: '{"intent":"arcane","route":"narration"}',
      backend: 'contract'
    })
  }
}

function proseCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: 'Arcane light flickers from the inactive mage.\n<<<CLAIMS\n>>>',
      backend: 'contract'
    })
  }
}
