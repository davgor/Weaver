import { DmIntentError } from './errors.js'
import { classifyPlayerIntent } from './classifyIntent.js'
import { resolveBuyIntent, resolveSellIntent } from './commerceHandler.js'
import { resolveTravelIntent } from './travelHandler.js'
import type {
  CharacterTravelApi,
  ItemCurrencyApi,
  ResolvedPlayerIntent,
  TravelDestinationLookup
} from './types.js'

export type ResolvePlayerIntentInput = {
  text: string
  currency: ItemCurrencyApi
  travel: CharacterTravelApi
  destinations: TravelDestinationLookup
  characterId?: string
  itemId?: string
  proposedPrice?: number
  campaignId?: string
  destinationId?: string
  proposedDays?: number
}

export function resolvePlayerIntent(input: ResolvePlayerIntentInput): ResolvedPlayerIntent {
  const kind = classifyPlayerIntent(input.text)
  if (kind === 'buy') {
    return resolveBuyIntent(input.currency, requireBuyFields(input))
  }
  if (kind === 'sell') {
    return resolveSellIntent(input.currency, requireSellFields(input))
  }
  if (kind === 'travel') {
    return resolveTravelIntent(input.travel, input.destinations, requireTravelFields(input))
  }
  return { kind: 'narration', text: input.text }
}

function requireBuyFields(input: ResolvePlayerIntentInput) {
  return {
    characterId: requireText(input.characterId, 'characterId'),
    itemId: requireText(input.itemId, 'itemId'),
    proposedPrice: requireNumber(input.proposedPrice, 'proposedPrice')
  }
}

function requireSellFields(input: ResolvePlayerIntentInput) {
  return requireBuyFields(input)
}

function requireTravelFields(input: ResolvePlayerIntentInput) {
  return {
    characterId: requireText(input.characterId, 'characterId'),
    campaignId: requireText(input.campaignId, 'campaignId'),
    destinationId: requireText(input.destinationId, 'destinationId'),
    proposedDays: requireNumber(input.proposedDays, 'proposedDays')
  }
}

function requireText(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for this intent`)
  }
  return value
}

function requireNumber(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for this intent`)
  }
  return value
}
