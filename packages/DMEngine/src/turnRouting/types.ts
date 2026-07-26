import type { EncounterState, SubmitCombatActionInput } from '@weaver/combat-engine'
import type { SceneBlock, SocialLine, TextCompleter } from '@weaver/narration-engine'
import type { NarrationPeers } from '@weaver/narration-engine'
import type {
  CharacterTravelApi,
  CommerceSuccess,
  ItemCurrencyApi,
  NarrationIntentResult,
  TravelDestinationLookup,
  TravelSuccess
} from '../intents/types.js'

export type TurnChannel = 'play' | 'askDm'

export type TurnRoute = 'commerce' | 'travel' | 'combat' | 'narration'

export type TurnRoutingErrorCode =
  | 'DM_TURN_ASK_DM_REJECTED'
  | 'DM_TURN_LOCK_CONFLICT'
  | 'DM_TURN_ROUTE_INVALID'
  | 'DM_TURN_COMBAT_INACTIVE'

export class TurnRoutingError extends Error {
  readonly code: TurnRoutingErrorCode

  constructor(code: TurnRoutingErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'TurnRoutingError'
    this.code = code
  }
}

export type RoutedIntentKind = 'buy' | 'sell' | 'travel' | 'combat' | 'narration'

export type RoutedIntent = {
  kind: RoutedIntentKind
  text: string
}

export type RoutePlan = {
  route: TurnRoute
  skipLlm: boolean
  intent: RoutedIntent
}

export type BranchResolution =
  | CommerceSuccess
  | TravelSuccess
  | CombatBranchResolution
  | NarrationIntentResult

export type CombatBranchResolution = {
  kind: 'combat'
  encounter: EncounterState
}

export type TurnNarrationOutcome = {
  kind: 'scene' | 'social'
  status: 'persisted' | 'rejected' | 'silent'
  prose?: string
}

export type TurnProjections = {
  scene: SceneBlock[]
  social: SocialLine[]
}

export type ResolveTurnInput = {
  channel: TurnChannel
  campaignId: string
  characterId: string
  text: string
  itemId?: string
  proposedPrice?: number
  destinationId?: string
  proposedDays?: number
  encounterId?: string
  combatAction?: string
  socialSpeakerId?: string
}

export type CombatTurnApi = {
  getEncounter: (encounterId: string) => EncounterState | undefined
  submitCombatAction: (input: SubmitCombatActionInput) => EncounterState
}

export type TurnPersistRecord = {
  campaignId: string
  characterId: string
  route: TurnRoute
  resolution: BranchResolution
  narration: TurnNarrationOutcome
}

export type ResolveTurnDeps = {
  completer: TextCompleter
  currency: ItemCurrencyApi
  travel: CharacterTravelApi
  destinations: TravelDestinationLookup
  narration: NarrationPeers
  combat: CombatTurnApi
  persist: (record: TurnPersistRecord) => void | Promise<void>
}

export type ResolveTurnResult = {
  route: TurnRoute
  skipLlm: boolean
  resolution: BranchResolution
  narration: TurnNarrationOutcome
  projections: TurnProjections
}

export type InterpretIntentInput = {
  text: string
  completer: TextCompleter
  combatActive: boolean
}

export type CommerceBranchInput = {
  intent: RoutedIntent
  currency: ItemCurrencyApi
  characterId: string
  itemId?: string
  proposedPrice?: number
}

export type TravelBranchInput = {
  intent: RoutedIntent
  travel: CharacterTravelApi
  destinations: TravelDestinationLookup
  campaignId: string
  destinationId?: string
  proposedDays?: number
}

export type CombatBranchInput = {
  combat: CombatTurnApi
  encounterId?: string
  combatantId: string
  combatAction?: string
}

export type NarrationFacts = {
  route: TurnRoute
  resolution: BranchResolution
  playerText: string
}
