import { DmIntentError } from './errors.js'
import type {
  CharacterTravelApi,
  TravelDestinationLookup,
  TravelDestinationPlacement,
  TravelIntentRequest,
  TravelSuccess
} from './types.js'

export function resolveTravelIntent(
  travel: CharacterTravelApi,
  destinations: TravelDestinationLookup,
  request: TravelIntentRequest
): TravelSuccess {
  assertDestinationGenerated(destinations, request.destinationId)
  const placement = destinations.resolvePlacement(request.destinationId)
  const advance = travel.advanceTravelDays(request.campaignId, request.proposedDays)
  travel.setCharacterLocation(toLocationInput(request, placement, advance.day))
  return {
    kind: 'travel',
    destinationId: request.destinationId,
    advance
  }
}

function assertDestinationGenerated(
  destinations: TravelDestinationLookup,
  destinationId: string
): void {
  if (!destinations.isGenerated(destinationId)) {
    destinations.ensureGenerated?.(destinationId)
  }
  if (destinations.isGenerated(destinationId)) {
    return
  }
  throw new DmIntentError(
    'DM_TRAVEL_REJECTED',
    `Travel rejected: destination ${destinationId} is ungenerated and live population is unavailable`
  )
}

function toLocationInput(
  request: TravelIntentRequest,
  placement: TravelDestinationPlacement,
  updatedDay: number
) {
  return {
    characterId: request.characterId,
    campaignId: request.campaignId,
    regionId: placement.regionId,
    locationKind: placement.locationKind,
    updatedDay,
    ...(placement.placeId === undefined ? {} : { placeId: placement.placeId })
  }
}
