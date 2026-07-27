import {
  advanceTravelDays,
  getCharacterProgression,
  getCharacterStats,
  recordAutosaveSnapshot,
  resolveCharacterDeath,
  setCharacterLocation
} from '@weaver/character-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import { createMemoryEncounterStore } from '@weaver/combat-engine'
import {
  askTheDm,
  createStoreCombatTurnApi,
  resolveTurn,
  type ResolveTurnDeps
} from '@weaver/dm-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import { createAskDmService, type AskDmService } from './askDmService.js'
import { createTurnService, type TurnService } from './turnService.js'

export type LivePlayDeps = {
  turnService: TurnService
  askDmService: AskDmService
}

type LivePlayDepsOptions = {
  textCompleter: TextCompleter
}

export function createLivePlayHandlerDeps(options: LivePlayDepsOptions): LivePlayDeps {
  const turnDeps = createLiveResolveTurnDeps(options.textCompleter)
  return {
    turnService: createTurnService({
      resolveTurn,
      deps: turnDeps,
      getEncounter: (encounterId) => turnDeps.combat.getEncounter(encounterId),
      character: {
        getCharacterStats,
        getCharacterProgression,
        recordAutosaveSnapshot,
        resolveCharacterDeath
      }
    }),
    askDmService: createAskDmService({
      askTheDm,
      narration: { fillAndValidate },
      completer: options.textCompleter,
      facts: (request) => ({ campaignId: request.campaignId, characterId: request.characterId })
    })
  }
}

export function createLiveResolveTurnDeps(completer: TextCompleter): ResolveTurnDeps {
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
