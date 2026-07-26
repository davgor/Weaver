import { describe, expect, it } from 'vitest'
import { advanceTravelDays } from '@weaver/character-engine'
import { clampProposedPrice, createCurrencyService } from '@weaver/item-engine'
import { resolvePlayerIntent } from './resolvePlayerIntent.js'
import type { ItemCurrencyApi, TravelDestinationLookup } from './types.js'

describe('resolvePlayerIntent commerce routing', () => {
  it('routes buy text through currency debit instead of pure narration', () => {
    const currency = createCurrencyApi()
    currency.credit('pc-route-buy', 200)

    const result = resolvePlayerIntent({
      text: 'I buy the iron sword',
      characterId: 'pc-route-buy',
      itemId: 'item.iron-sword',
      proposedPrice: 25,
      currency,
      travel: { advanceTravelDays },
      destinations: alwaysGenerated()
    })

    expect(result.kind).toBe('buy')
    if (result.kind !== 'buy') {
      return
    }
    expect(result.price).toBe(clampProposedPrice(25))
    expect(currency.getBalance('pc-route-buy')).toBe(200 - clampProposedPrice(25))
  })

  it('routes sell text through currency credit instead of pure narration', () => {
    const currency = createCurrencyApi()

    const result = resolvePlayerIntent({
      text: 'I sell the rusty dagger',
      characterId: 'pc-route-sell',
      itemId: 'item.rusty-dagger',
      proposedPrice: 8,
      currency,
      travel: { advanceTravelDays },
      destinations: alwaysGenerated()
    })

    expect(result.kind).toBe('sell')
    expect(currency.getBalance('pc-route-sell')).toBe(clampProposedPrice(8))
  })
})

describe('resolvePlayerIntent travel and narration', () => {
  it('routes travel text through day advance instead of pure narration', () => {
    const result = resolvePlayerIntent({
      text: 'I travel to Riverford',
      campaignId: 'campaign-route-travel',
      destinationId: 'place.riverford',
      proposedDays: 4,
      currency: createCurrencyApi(),
      travel: { advanceTravelDays },
      destinations: alwaysGenerated()
    })

    expect(result.kind).toBe('travel')
    if (result.kind !== 'travel') {
      return
    }
    expect(result.advance.advancedDays).toBe(4)
  })

  it('keeps non-matching text as narration without touching currency', () => {
    const currency = createCurrencyApi()
    currency.credit('pc-route-narration', 40)

    const result = resolvePlayerIntent({
      text: 'I look around the tavern',
      characterId: 'pc-route-narration',
      currency,
      travel: { advanceTravelDays },
      destinations: alwaysGenerated()
    })

    expect(result).toEqual({ kind: 'narration', text: 'I look around the tavern' })
    expect(currency.getBalance('pc-route-narration')).toBe(40)
  })
})

function createCurrencyApi(): ItemCurrencyApi {
  const service = createCurrencyService()
  return {
    credit: (characterId, amount) => service.credit(characterId, amount),
    debit: (characterId, amount) => service.debit(characterId, amount),
    getBalance: (characterId) => service.getBalance(characterId),
    clampProposedPrice
  }
}

function alwaysGenerated(): TravelDestinationLookup {
  return { isGenerated: () => true }
}
