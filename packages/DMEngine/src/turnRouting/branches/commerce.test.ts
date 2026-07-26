import { describe, expect, it } from 'vitest'
import { clampProposedPrice, createCurrencyService } from '@weaver/item-engine'
import { DmIntentError } from '../../intents/errors.js'
import { resolveCommerceBranch } from './commerce.js'

describe('resolveCommerceBranch', () => {
  it('sells through currency credit and rejects missing item id', () => {
    const currency = createCurrencyService()
    const characterId = 'pc-sell'
    const sold = resolveCommerceBranch({
      characterId,
      intent: { kind: 'sell', text: 'I sell the dagger' },
      currency: {
        credit: currency.credit.bind(currency),
        debit: currency.debit.bind(currency),
        getBalance: currency.getBalance.bind(currency),
        clampProposedPrice
      },
      itemId: 'item.dagger',
      proposedPrice: 5
    })
    expect(sold).toMatchObject({ kind: 'sell', itemId: 'item.dagger' })
    expect(currency.getBalance(characterId)).toBe(clampProposedPrice(5))

    expect(() =>
      resolveCommerceBranch({
        characterId,
        intent: { kind: 'buy', text: 'buy something' },
        currency: {
          credit: currency.credit.bind(currency),
          debit: currency.debit.bind(currency),
          getBalance: currency.getBalance.bind(currency),
          clampProposedPrice
        },
        proposedPrice: 1
      })
    ).toThrow(DmIntentError)
  })
})
