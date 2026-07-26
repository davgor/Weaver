import { describe, expect, it } from 'vitest'
import {
  InsufficientFundsError,
  clampProposedPrice,
  createCurrencyService,
  itemEngine
} from '@weaver/item-engine'
import { DmIntentError } from '../intents/errors.js'
import { resolveBuyIntent, resolveSellIntent } from '../intents/commerceHandler.js'

describe('DMEngine -> ItemEngine currency contract (033)', () => {
  it('buys and sells through the published debit/credit + clamp API', () => {
    const characterId = 'pc-dm-currency-contract'
    const currency = {
      credit: itemEngine.credit.bind(itemEngine),
      debit: itemEngine.debit.bind(itemEngine),
      getBalance: itemEngine.getBalance.bind(itemEngine),
      clampProposedPrice: itemEngine.clampProposedPrice.bind(itemEngine)
    }

    itemEngine.credit(characterId, 40)
    const buy = resolveBuyIntent(currency, {
      characterId,
      itemId: 'item.contract-sword',
      proposedPrice: 12
    })
    expect(buy.price).toBe(clampProposedPrice(12))
    expect(itemEngine.getBalance(characterId)).toBe(40 - clampProposedPrice(12))

    const sell = resolveSellIntent(currency, {
      characterId,
      itemId: 'item.contract-loot',
      proposedPrice: 3
    })
    expect(sell.price).toBe(clampProposedPrice(3))
    expect(itemEngine.getBalance(characterId)).toBe(40 - clampProposedPrice(12) + clampProposedPrice(3))
  })

  it('rejects insufficient funds grounded in the real ItemEngine debit error', () => {
    const service = createCurrencyService()
    service.credit('pc-dm-funds-contract', 1)
    const currency = {
      credit: service.credit.bind(service),
      debit: service.debit.bind(service),
      getBalance: service.getBalance.bind(service),
      clampProposedPrice
    }

    expect(() => service.debit('pc-dm-funds-contract', 25)).toThrow(InsufficientFundsError)

    try {
      resolveBuyIntent(currency, {
        characterId: 'pc-dm-funds-contract',
        itemId: 'item.expensive',
        proposedPrice: 25
      })
      expect.unreachable('expected commerce rejection')
    } catch (error) {
      expect(error).toBeInstanceOf(DmIntentError)
      expect((error as DmIntentError).cause).toBeInstanceOf(InsufficientFundsError)
    }
  })
})
