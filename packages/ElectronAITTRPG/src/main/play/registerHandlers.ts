import { ipcMain } from 'electron'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import { createMemoryEncounterStore, getEncounter, submitCombatAction } from '@weaver/combat-engine'
import { askTheDm, resolveTurn, type ResolveTurnDeps } from '@weaver/dm-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import type { AskDmRequest, SubmitPlayActionRequest } from '../../shared/play/types.js'
import { createAskDmService, type AskDmService } from './askDmService.js'
import { createTurnService, type TurnService } from './turnService.js'

type PlayHandlerDeps = {
  turnService: TurnService<ResolveTurnDeps>
  askDmService: AskDmService
}

export function createLivePlayHandlerDeps(): PlayHandlerDeps {
  const turnDeps = createLiveResolveTurnDeps()
  return {
    turnService: createTurnService({
      resolveTurn,
      deps: turnDeps,
      getEncounter: (encounterId) => turnDeps.combat.getEncounter(encounterId)
    }),
    askDmService: createAskDmService({
      askTheDm,
      narration: { fillAndValidate },
      completer: scriptedCompleter('The DM answers from established campaign notes.\n<<<CLAIMS\n>>>'),
      facts: (request) => ({ campaignId: request.campaignId, characterId: request.characterId })
    })
  }
}

export function registerPlayHandlers(deps: PlayHandlerDeps = createLivePlayHandlerDeps()): void {
  ipcMain.handle('play:submitAction', (_event, request: SubmitPlayActionRequest) =>
    deps.turnService.submitAction(request)
  )
  ipcMain.handle('play:askDm', (_event, request: AskDmRequest) => deps.askDmService.ask(request))
}

function createLiveResolveTurnDeps(): ResolveTurnDeps {
  const currency = createCurrencyService()
  const store = createMemoryEncounterStore()
  return {
    completer: scriptedCompleter('{"intent":"look","route":"narration"}'),
    currency: {
      credit: (characterId, amount) => currency.credit(characterId, amount),
      debit: (characterId, amount) => currency.debit(characterId, amount),
      getBalance: (characterId) => currency.getBalance(characterId),
      clampProposedPrice
    },
    travel: { advanceTravelDays: (campaignId, days) => ({ campaignId, advancedDays: days, day: days }) },
    destinations: { isGenerated: () => true },
    narration: {
      llm: scriptedCompleter('The scene shifts around your choice.\n<<<CLAIMS\n>>>'),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: {
      getEncounter: (encounterId) => getEncounter({ encounterId, store }),
      submitCombatAction: (input) => submitCombatAction({ ...input, store })
    },
    persist: () => undefined
  }
}

function scriptedCompleter(text: string): TextCompleter {
  return { completeText: async () => ({ text, backend: 'scripted' }) }
}
