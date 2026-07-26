import { DmIntentError } from './errors.js'
import type {
  CharacterTravelApi,
  TravelDestinationLookup,
  TravelIntentRequest,
  TravelSuccess
} from './types.js'

export function resolveTravelIntent(
  travel: CharacterTravelApi,
  destinations: TravelDestinationLookup,
  request: TravelIntentRequest
): TravelSuccess {
  if (!destinations.isGenerated(request.destinationId)) {
    destinations.ensureGenerated?.(request.destinationId)
  }
  if (!destinations.isGenerated(request.destinationId)) {
    throw new DmIntentError(
      'DM_TRAVEL_REJECTED',
      `Travel rejected: destination ${request.destinationId} is ungenerated and live population is unavailable`
    )
  }
  const advance = travel.advanceTravelDays(request.campaignId, request.proposedDays)
  return {
    kind: 'travel',
    destinationId: request.destinationId,
    advance
  }
}
