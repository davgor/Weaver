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

export type TravelLocationKind = 'overworld' | 'settlement' | 'dungeon'

export type TravelDestinationPlacement = {
  regionId: string
  placeId?: string
  locationKind: TravelLocationKind
}

export type SetTravelCharacterLocationInput = {
  characterId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: TravelLocationKind
  updatedDay?: number
}

export type CharacterLocationSnapshot = {
  characterId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: TravelLocationKind
  updatedDay?: number
}
