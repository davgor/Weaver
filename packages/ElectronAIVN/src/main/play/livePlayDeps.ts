import { advanceTravelDays, setCharacterLocation } from '@weaver/character-engine'
import { createMemoryEncounterStore } from '@weaver/combat-engine'
import { createStoreCombatTurnApi, type ResolveTurnDeps } from '@weaver/dm-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import type { TextCompleter } from '@weaver/narration-engine'

export function createLiveVnResolveTurnDeps(completer: TextCompleter): ResolveTurnDeps {
  const currency = createCurrencyService()
  const store = createMemoryEncounterStore()
  return {
    completer,
    currency: {
      credit: (characterId, amount) => currency.credit(characterId, amount),
      debit: (characterId, amount) => currency.debit(characterId, amount),
      getBalance: (characterId) => currency.getBalance(characterId),
      clampProposedPrice
    },
    travel: { advanceTravelDays, setCharacterLocation },
    destinations: {
      isGenerated: () => true,
      resolvePlacement: (destinationId) => ({
        regionId: destinationId,
        placeId: destinationId,
        locationKind: 'settlement'
      })
    },
    narration: {
      llm: completer,
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: createStoreCombatTurnApi(store),
    persist: () => undefined
  }
}
