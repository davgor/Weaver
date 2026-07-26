import { beforeEach, describe, expect, it } from 'vitest'
import { clearNarrationStore, type TextCompleter } from '@weaver/narration-engine'
import { resolveTurn, type ResolveTurnDeps, type TurnPersistRecord } from '@weaver/dm-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import { TURN_FAILURE_MESSAGE } from '../../shared/play/recoveryCopy.js'
import { createTurnService } from './turnService.js'

describe('turnService provider failure mid-turn', () => {
  beforeEach(() => {
    clearNarrationStore()
  })

  it('returns a turn failure and does not persist campaign state when the provider fails', async () => {
    const persisted: TurnPersistRecord[] = []
    const currency = createCurrencyService()
    currency.credit('pc-fail', 50)

    const service = createTurnService({
      resolveTurn,
      deps: failingProviderDeps(currency, persisted)
    })

    const result = await service.submitAction({
      campaignId: 'camp-fail',
      characterId: 'pc-fail',
      text: 'look around the hall'
    })

    expect(result).toEqual({
      ok: false,
      kind: 'turn',
      message: TURN_FAILURE_MESSAGE,
      code: 'PLAY_TURN_FAILED'
    })
    expect(persisted).toHaveLength(0)
    expect(currency.getBalance('pc-fail')).toBe(50)
  })
})

function failingProviderDeps(
  currency: ReturnType<typeof createCurrencyService>,
  persisted: TurnPersistRecord[]
): ResolveTurnDeps {
  return {
    completer: timeoutCompleter(),
    currency: {
      credit: (characterId, amount) => currency.credit(characterId, amount),
      debit: (characterId, amount) => currency.debit(characterId, amount),
      getBalance: (characterId) => currency.getBalance(characterId),
      clampProposedPrice
    },
    travel: { advanceTravelDays: (campaignId, days) => ({ campaignId, advancedDays: days, day: days }) },
    destinations: { isGenerated: () => true },
    narration: {
      llm: timeoutCompleter(),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: {
      getEncounter: () => undefined,
      submitCombatAction: () => {
        throw new Error('combat should not run')
      }
    },
    persist: (record) => {
      persisted.push(record)
    }
  }
}

function timeoutCompleter(): TextCompleter {
  return {
    completeText: async () => {
      throw new Error('provider timeout')
    }
  }
}
