import { describe, expect, it } from 'vitest'
import {
  InsufficientFundsError,
  clampProposedPrice,
  createCurrencyService
} from '@weaver/item-engine'
import { DmIntentError } from './errors.js'
import { resolveBuyIntent, resolveSellIntent } from './commerceHandler.js'
import type { ItemCurrencyApi } from './types.js'

describe('commerceHandler buy and sell', () => {
  it('buys through clamp + debit, changing real currency balance', () => {
    const currency = createCurrencyApi()
    const startingBalance = 20_000
    currency.credit('pc-buy', startingBalance)

    const result = resolveBuyIntent(currency, {
      characterId: 'pc-buy',
      itemId: 'item.iron-sword',
      proposedPrice: 50_000
    })

    const clamped = clampProposedPrice(50_000)
    expect(result.kind).toBe('buy')
    expect(result.price).toBe(clamped)
    expect(result.balance.balance).toBe(startingBalance - clamped)
    expect(currency.getBalance('pc-buy')).toBe(startingBalance - clamped)
  })

  it('sells through clamp + credit', () => {
    const currency = createCurrencyApi()
    currency.credit('pc-sell', 5)

    const result = resolveSellIntent(currency, {
      characterId: 'pc-sell',
      itemId: 'item.rusty-dagger',
      proposedPrice: 0
    })

    expect(result.kind).toBe('sell')
    expect(result.price).toBe(clampProposedPrice(0))
    expect(currency.getBalance('pc-sell')).toBe(5 + clampProposedPrice(0))
  })
})

describe('commerceHandler rejection', () => {
  it('rejects insufficient funds with an engine-grounded error', () => {
    const currency = createCurrencyApi()
    currency.credit('pc-broke', 2)

    expect(() =>
      resolveBuyIntent(currency, {
        characterId: 'pc-broke',
        itemId: 'item.iron-sword',
        proposedPrice: 20
      })
    ).toThrow(DmIntentError)

    expectInsufficientFundsDetails(currency)
    expect(currency.getBalance('pc-broke')).toBe(2)
  })
})

function expectInsufficientFundsDetails(currency: ItemCurrencyApi): void {
  try {
    resolveBuyIntent(currency, {
      characterId: 'pc-broke',
      itemId: 'item.iron-sword',
      proposedPrice: 20
    })
  } catch (error) {
    expect(error).toBeInstanceOf(DmIntentError)
    expect((error as DmIntentError).code).toBe('DM_COMMERCE_REJECTED')
    expect((error as DmIntentError).cause).toBeInstanceOf(InsufficientFundsError)
  }
}

function createCurrencyApi(): ItemCurrencyApi {
  const service = createCurrencyService()
  return {
    credit: (characterId, amount) => service.credit(characterId, amount),
    debit: (characterId, amount) => service.debit(characterId, amount),
    getBalance: (characterId) => service.getBalance(characterId),
    clampProposedPrice
  }
}
