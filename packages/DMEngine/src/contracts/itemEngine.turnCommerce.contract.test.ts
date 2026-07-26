import { describe, expect, it } from 'vitest'
import { clampProposedPrice, itemEngine } from '@weaver/item-engine'
import { resolveCommerceBranch } from '../turnRouting/branches/commerce.js'
import type { RoutedIntent } from '../turnRouting/types.js'

describe('DMEngine turnRouting -> ItemEngine currency contract (053/033)', () => {
  it('routes buy branch through the published ItemEngine debit API', () => {
    const characterId = 'pc-turn-commerce-buy'
    itemEngine.restoreCampaignBalances({ [characterId]: 0 })
    itemEngine.credit(characterId, 50)
    const intent: RoutedIntent = { kind: 'buy', text: 'I buy the iron sword' }

    const result = resolveCommerceBranch({
      characterId,
      intent,
      currency: {
        credit: itemEngine.credit.bind(itemEngine),
        debit: itemEngine.debit.bind(itemEngine),
        getBalance: itemEngine.getBalance.bind(itemEngine),
        clampProposedPrice: itemEngine.clampProposedPrice.bind(itemEngine)
      },
      itemId: 'item.turn-sword',
      proposedPrice: 12
    })

    expect(result).toMatchObject({
      kind: 'buy',
      itemId: 'item.turn-sword',
      price: clampProposedPrice(12)
    })
    expect(itemEngine.getBalance(characterId)).toBe(50 - clampProposedPrice(12))
  })
})
