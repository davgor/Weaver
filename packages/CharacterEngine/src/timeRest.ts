import { CharacterEngineError } from './errors.js'

export type TravelDayAdvance = {
  currentDay: number
  advancedDays: number
  day: number
}

export type CampaignDay = {
  campaignId: string
  day: number
}

export type CampaignTravelDayAdvance = {
  campaignId: string
  advancedDays: number
  day: number
}

const MIN_TRAVEL_DAYS = 1
const MAX_TRAVEL_DAYS = 30
const campaignDays = new Map<string, number>()

export function nextDayAfterLongRest(currentDay: number): number {
  assertDay(currentDay, 'currentDay')
  return currentDay + 1
}

export function clampTravelDays(proposedDays: number): number {
  if (!Number.isFinite(proposedDays)) {
    throw new CharacterEngineError('TIME_INPUT_INVALID', 'proposedDays must be a finite number')
  }
  const wholeDays = Math.trunc(proposedDays)
  return Math.min(MAX_TRAVEL_DAYS, Math.max(MIN_TRAVEL_DAYS, wholeDays))
}

export function advanceTravelDayCounter(
  currentDay: number,
  proposedDays: number
): TravelDayAdvance {
  assertDay(currentDay, 'currentDay')
  const advancedDays = clampTravelDays(proposedDays)
  return {
    currentDay,
    advancedDays,
    day: currentDay + advancedDays
  }
}

export function getCampaignDay(campaignId: string): number {
  return campaignDays.get(campaignId) ?? 0
}

export function setCampaignDay(campaignId: string, day: number): CampaignDay {
  assertDay(day, 'day')
  campaignDays.set(campaignId, day)
  return { campaignId, day }
}

export function advanceTravelDays(
  campaignId: string,
  proposedDays: number
): CampaignTravelDayAdvance {
  const advance = advanceTravelDayCounter(getCampaignDay(campaignId), proposedDays)
  campaignDays.set(campaignId, advance.day)
  return {
    campaignId,
    advancedDays: advance.advancedDays,
    day: advance.day
  }
}

function assertDay(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CharacterEngineError('TIME_INPUT_INVALID', `${label} must be a non-negative integer`)
  }
}
