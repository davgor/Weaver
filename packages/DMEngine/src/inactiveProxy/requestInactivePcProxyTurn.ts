import type { InactiveProxyActionSuggestion } from '@weaver/character-engine'
import { InactiveProxyError } from './errors.js'
import type {
  RequestInactivePcProxyTurnDeps,
  RequestInactivePcProxyTurnInput,
  InactivePcProxyTurnResult
} from './types.js'
import type { ResolveTurnInput } from '../turnRouting/types.js'

export async function requestInactivePcProxyTurn(
  input: RequestInactivePcProxyTurnInput,
  deps: RequestInactivePcProxyTurnDeps
): Promise<InactivePcProxyTurnResult> {
  validateInput(input)
  const suggestion = deps.characters.requestInactiveProxyAction({
    characterId: input.characterId,
    intentTag: input.intentTag
  })
  const turn = await deps.resolveTurn(buildProxyTurnInput(input, suggestion), deps.turnDeps)
  return { suggestion, turn }
}

function validateInput(input: RequestInactivePcProxyTurnInput): void {
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.activeCharacterId, 'activeCharacterId')
  assertNonEmpty(input.intentTag, 'intentTag')
  if (input.characterId === input.activeCharacterId) {
    throw new InactiveProxyError(
      'DM_INACTIVE_PROXY_TARGET_ACTIVE',
      'Inactive proxy turns require a character other than the active player character'
    )
  }
}

function buildProxyTurnInput(
  input: RequestInactivePcProxyTurnInput,
  suggestion: InactiveProxyActionSuggestion
): ResolveTurnInput {
  return {
    channel: 'play',
    campaignId: input.campaignId,
    characterId: input.characterId,
    text: buildProxyTurnText(suggestion),
    socialSpeakerId: input.characterId
  }
}

function buildProxyTurnText(suggestion: InactiveProxyActionSuggestion): string {
  if (suggestion.actionId !== null) {
    return suggestion.actionId.replaceAll('_', ' ')
  }
  return suggestion.kitTag ?? suggestion.intentTag
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new InactiveProxyError('DM_INACTIVE_PROXY_INPUT_INVALID', `${label} must not be empty`)
  }
}
