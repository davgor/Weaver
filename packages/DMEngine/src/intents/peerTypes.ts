/** Narrow peer shapes so intent modules stay free of deep package imports. */

export type CurrencyBalanceSnapshot = {
  characterId: string
  balance: number
}

export type PriceClampOptions = {
  min?: number
  max?: number
}

export type CampaignTravelDayAdvance = {
  campaignId: string
  advancedDays: number
  day: number
}
