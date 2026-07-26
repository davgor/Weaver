import type { AppliedEffect, UseActionInput, UseActionResult } from '@weaver/action-engine'
import type {
  ApplySurrenderInput,
  ApplySurrenderResult,
  AttemptFleeInput,
  AttemptFleeResult,
  EncounterState,
  ExecuteCombatantInput,
  OutcomeResolutionResult,
  ResolveAttackInput,
  ResolveAttackResult,
  ResolveNonLethalInput,
  StartAdHocEncounterInput,
  StartEncounterInput,
  SubmitCombatActionInput
} from '@weaver/combat-engine'
import type { LootDrop } from '@weaver/item-engine'
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
import type {
  CharacterProgressionApi,
  CombatRewards,
  EncounterIdFactory,
  EncounterRewardRequest,
  EncounterStartRequest
} from '../encounterLoop/types.js'

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

export type CombatOutcome =
  | {
      type: 'attack'
      hit: boolean
      totalDamage: number
      critical: boolean
      targetId: string
      targetHp: { current: number; max: number } | null
      conditions: readonly string[]
    }
  | {
      type: 'flee'
      success: boolean
      roll: number
      total: number
      dc: number
    }
  | { type: 'surrender' }
  | { type: 'nonLethal'; targetId: string; loot: readonly LootDrop[] }
  | { type: 'execute'; targetId: string; loot: readonly LootDrop[] }
  | {
      type: 'action'
      actionId: string
      appliedEffects: readonly AppliedEffect[]
      lockout: { actionTurns: number }
    }
  | { type: 'typed'; action: string }

export type CombatBranchResolution = {
  kind: 'combat'
  encounter: EncounterState
  outcome: CombatOutcome
  rewards?: CombatRewards
}

export type CombatIntent =
  | {
      kind: 'attack'
      targetId: string
      weaponInstanceId: string
      attackAbility: 'Body' | 'Agility' | 'Mind' | 'Presence'
      proficient?: boolean
      proficiencyBonus?: number
    }
  | { kind: 'flee'; dc?: number }
  | { kind: 'surrender' }
  | { kind: 'nonLethal'; targetId: string; lootSeed: string }
  | { kind: 'execute'; targetId: string; lootSeed: string }
  | {
      kind: 'action'
      actionId: string
      targetIds: readonly string[]
      distanceFeet: number
      weaponReachFeet?: number
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
  encounterStart?: EncounterStartRequest
  encounterRewards?: EncounterRewardRequest
  combatAction?: string
  combatIntent?: CombatIntent
  socialSpeakerId?: string
}

export type CombatTurnApi = {
  getEncounter: (encounterId: string) => EncounterState | undefined
  startEncounter: (input: Omit<StartEncounterInput, 'store'>) => EncounterState
  startAdHocEncounter: (input: Omit<StartAdHocEncounterInput, 'store'>) => EncounterState
  resolveEncounter: (encounterId: string) => EncounterState
  submitCombatAction: (input: SubmitCombatActionInput) => EncounterState
  resolveAttack: (input: Omit<ResolveAttackInput, 'store'>) => ResolveAttackResult
  attemptFlee: (input: Omit<AttemptFleeInput, 'store'>) => AttemptFleeResult
  applySurrender: (input: Omit<ApplySurrenderInput, 'store'>) => ApplySurrenderResult
  resolveNonLethalVictory: (input: Omit<ResolveNonLethalInput, 'store'>) => OutcomeResolutionResult
  executeHelplessCombatant: (input: Omit<ExecuteCombatantInput, 'store'>) => OutcomeResolutionResult
}

export type CombatActionsApi = {
  useAction: (input: UseActionInput) => UseActionResult
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
  actions?: CombatActionsApi
  progression?: CharacterProgressionApi
  createEncounterId?: EncounterIdFactory
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
  characterId: string
  destinationId?: string
  proposedDays?: number
}

export type CombatBranchInput = {
  combat: CombatTurnApi
  encounterId?: string
  combatantId: string
  combatAction?: string
  combatIntent?: CombatIntent
  actions?: CombatActionsApi
}

export type NarrationFacts = {
  route: TurnRoute
  resolution: BranchResolution
  playerText: string
}
