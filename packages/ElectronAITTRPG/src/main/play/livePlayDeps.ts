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
import { createCampaignLivePlayDeps } from './createCampaignLivePlayDeps.js'
import { createTurnService, type TurnService } from './turnService.js'

export type LivePlayDeps = {
  turnService: TurnService
  askDmService: AskDmService
}

type LivePlayDepsOptions = {
  textCompleter: TextCompleter
  campaignsRoot: string
}

export function createLivePlayHandlerDeps(options: LivePlayDepsOptions): LivePlayDeps {
  return {
    turnService: createTurnService({
      resolveTurn,
      getDeps: (campaignId, characterId) =>
        createCampaignLivePlayDeps({
          campaignId,
          characterId,
          campaignsRoot: options.campaignsRoot,
          textCompleter: options.textCompleter
        }).resolveTurnDeps,
      getEncounter: (encounterId, campaignId, characterId) =>
        createCampaignLivePlayDeps({
          campaignId,
          characterId,
          campaignsRoot: options.campaignsRoot,
          textCompleter: options.textCompleter
        }).resolveTurnDeps.combat.getEncounter(encounterId),
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

/** In-memory ResolveTurnDeps for unit/smoke tests. Production uses createCampaignLivePlayDeps. */
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
