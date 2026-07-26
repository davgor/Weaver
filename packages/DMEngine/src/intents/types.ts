import type {
  CampaignTravelDayAdvance,
  CurrencyBalanceSnapshot,
  PriceClampOptions
} from './peerTypes.js'

export type PlayerIntentKind = 'buy' | 'sell' | 'travel' | 'narration'

export type ItemCurrencyApi = {
  credit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  debit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  getBalance: (characterId: string) => number
  clampProposedPrice: (proposed: number, opts?: PriceClampOptions) => number
}

export type CharacterTravelApi = {
  advanceTravelDays: (campaignId: string, proposedDays: number) => CampaignTravelDayAdvance
}

export type TravelDestinationLookup = {
  isGenerated: (destinationId: string) => boolean
}

export type BuyIntentRequest = {
  characterId: string
  proposedPrice: number
  itemId: string
  priceClamp?: PriceClampOptions
}

export type SellIntentRequest = {
  characterId: string
  proposedPrice: number
  itemId: string
  priceClamp?: PriceClampOptions
}

export type TravelIntentRequest = {
  campaignId: string
  destinationId: string
  proposedDays: number
}

export type CommerceSuccess = {
  kind: 'buy' | 'sell'
  itemId: string
  price: number
  balance: CurrencyBalanceSnapshot
}

export type TravelSuccess = {
  kind: 'travel'
  destinationId: string
  advance: CampaignTravelDayAdvance
}

export type NarrationIntentResult = {
  kind: 'narration'
  text: string
}

export type ResolvedPlayerIntent =
  | CommerceSuccess
  | TravelSuccess
  | NarrationIntentResult
