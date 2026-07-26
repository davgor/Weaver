import { DmIntentError } from '../../intents/errors.js'
import { resolveBuyIntent, resolveSellIntent } from '../../intents/commerceHandler.js'
import type { CommerceBranchInput } from '../types.js'
import type { BranchResolution } from '../types.js'

export function resolveCommerceBranch(input: CommerceBranchInput): BranchResolution {
  if (input.intent.kind === 'buy') {
    return resolveBuyIntent(input.currency, {
      characterId: input.characterId,
      itemId: requireText(input.itemId, 'itemId'),
      proposedPrice: requireNumber(input.proposedPrice, 'proposedPrice')
    })
  }
  if (input.intent.kind === 'sell') {
    return resolveSellIntent(input.currency, {
      characterId: input.characterId,
      itemId: requireText(input.itemId, 'itemId'),
      proposedPrice: requireNumber(input.proposedPrice, 'proposedPrice')
    })
  }
  throw new DmIntentError('DM_INTENT_INPUT_INVALID', 'Commerce route requires buy or sell intent')
}

function requireText(value: string | undefined, label: string): string {
  if (value === undefined || value.trim().length === 0) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for commerce turns`)
  }
  return value
}

function requireNumber(value: number | undefined, label: string): number {
  if (value === undefined || !Number.isFinite(value)) {
    throw new DmIntentError('DM_INTENT_INPUT_INVALID', `${label} is required for commerce turns`)
  }
  return value
}
