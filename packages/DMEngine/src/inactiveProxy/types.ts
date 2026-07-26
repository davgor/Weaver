import type {
  InactiveProxyActionRequest,
  InactiveProxyActionSuggestion
} from '@weaver/character-engine'
import type { ResolveTurnInput, ResolveTurnDeps, ResolveTurnResult } from '../turnRouting/types.js'

export type InactiveProxyCharacterApi = {
  requestInactiveProxyAction: (
    input: InactiveProxyActionRequest
  ) => InactiveProxyActionSuggestion
}

export type ResolveTurnFn = (
  input: ResolveTurnInput,
  deps: ResolveTurnDeps
) => Promise<ResolveTurnResult>

export type RequestInactivePcProxyTurnInput = {
  campaignId: string
  characterId: string
  activeCharacterId: string
  intentTag: string
}

export type RequestInactivePcProxyTurnDeps = {
  characters: InactiveProxyCharacterApi
  resolveTurn: ResolveTurnFn
  turnDeps: ResolveTurnDeps
}

export type InactivePcProxyTurnResult = {
  suggestion: InactiveProxyActionSuggestion
  turn: ResolveTurnResult
}
