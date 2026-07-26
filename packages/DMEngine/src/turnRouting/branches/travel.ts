import { DmIntentError } from '../../intents/errors.js'
import { resolveTravelIntent } from '../../intents/travelHandler.js'
import type { BranchResolution, TravelBranchInput } from '../types.js'

export function resolveTravelBranch(input: TravelBranchInput): BranchResolution {
  return resolveTravelIntent(input.travel, input.destinations, {
    campaignId: input.campaignId,
    destinationId: requireText(input.destinationId, 'destinationId'),
    proposedDays: requireNumber(input.proposedDays, 'proposedDays')
  })
}

function requireText(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for travel turns`)
  }
  return value
}

function requireNumber(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for travel turns`)
  }
  return value
}
