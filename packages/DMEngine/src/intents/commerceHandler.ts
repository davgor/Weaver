import { InsufficientFundsError } from '@weaver/item-engine'
import { DmIntentError } from './errors.js'
import type { BuyIntentRequest, CommerceSuccess, ItemCurrencyApi, SellIntentRequest } from './types.js'

export function resolveBuyIntent(
  currency: ItemCurrencyApi,
  request: BuyIntentRequest
): CommerceSuccess {
  const price = currency.clampProposedPrice(request.proposedPrice, request.priceClamp)
  try {
    const balance = currency.debit(request.characterId, price)
    return { kind: 'buy', itemId: request.itemId, price, balance }
  } catch (error) {
    throw toCommerceRejection(error)
  }
}

export function resolveSellIntent(
  currency: ItemCurrencyApi,
  request: SellIntentRequest
): CommerceSuccess {
  const price = currency.clampProposedPrice(request.proposedPrice, request.priceClamp)
  const balance = currency.credit(request.characterId, price)
  return { kind: 'sell', itemId: request.itemId, price, balance }
}

function toCommerceRejection(error: unknown): DmIntentError {
  if (error instanceof InsufficientFundsError) {
    return new DmIntentError('DM_COMMERCE_REJECTED', error.message, { cause: error })
  }
  if (error instanceof Error) {
    return new DmIntentError('DM_COMMERCE_REJECTED', error.message, { cause: error })
  }
  return new DmIntentError('DM_COMMERCE_REJECTED', 'Commerce intent rejected')
}
