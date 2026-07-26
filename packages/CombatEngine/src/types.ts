import type { AbilityScores } from '@weaver/character-engine'

export type CombatantKind = 'character' | 'npc' | 'enemy'

export type HitPointState = {
  current: number
  max: number
}

export type EncounterCombatantInput = {
  id: string
  kind: CombatantKind
  abilityScores: AbilityScores
  displayName?: string
  hp?: HitPointState
  armorClass?: number
}

export type InitiativeResult = {
  roll: number
  modifier: number
  total: number
}

export type EncounterCombatant = EncounterCombatantInput & {
  initiative: InitiativeResult
}

export type CurrentTurnState = {
  combatantId: string
  actionUsed: boolean
  movementUsed: boolean
}

export type TypedCombatActionInput = {
  type: 'typed-action'
  action: string
}

export type CombatMovementInput = {
  description: string
  distanceFeet?: number
}

export type TurnLogEntry =
  | {
      kind: 'action'
      round: number
      combatantId: string
      action: TypedCombatActionInput
    }
  | {
      kind: 'movement'
      round: number
      combatantId: string
      movement: CombatMovementInput
    }

export type EncounterState = {
  encounterId: string
  status: 'active'
  combatants: EncounterCombatant[]
  turnOrder: string[]
  currentTurnIndex: number
  round: number
  currentTurn: CurrentTurnState
  turnLog: TurnLogEntry[]
}

export type EncounterStore = {
  saveEncounter: (encounter: EncounterState) => EncounterState
  getEncounter: (encounterId: string) => EncounterState | undefined
}

export type EncounterStoreOptions = {
  dataRoot: string
}

export type StartEncounterInput = {
  encounterId: string
  combatants: readonly EncounterCombatantInput[]
  dataRoot?: string
  store?: EncounterStore
}

export type StartEncounterDeps = {
  roller?: () => number
}

export type EncounterLookupInput = {
  encounterId: string
  dataRoot?: string
  store?: EncounterStore
}

export type SubmitCombatActionInput = EncounterLookupInput & {
  combatantId: string
  action: TypedCombatActionInput
}

export type SubmitMovementInput = EncounterLookupInput & {
  combatantId: string
  movement: CombatMovementInput
}

export type EndTurnInput = EncounterLookupInput & {
  combatantId: string
}
