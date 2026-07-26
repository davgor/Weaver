import type { AbilityScores } from '@weaver/character-engine'
import type { GenerateEncounterFoesInput } from '@weaver/enemy-engine'
import type { GenerateLootRequest, LootDrop } from '@weaver/item-engine'
import type {
  DefeatDispositionValue,
  SetNpcDefeatDispositionInput
} from '@weaver/npc-engine'

export type CombatantKind = 'character' | 'npc' | 'enemy'

export type CombatConditionId =
  | 'restrained'
  | 'stunned'
  | 'helpless'
  | 'down'
  | 'surrendered'
  | 'fled'
  | 'executed'

export type EncounterStatus = 'active' | 'resolved'
export type EncounterStartMode = 'pre-authored' | 'ad-hoc'

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
  conditions?: readonly CombatConditionId[]
}

export type InitiativeResult = {
  roll: number
  modifier: number
  total: number
}

export type EncounterCombatant = Omit<EncounterCombatantInput, 'conditions'> & {
  initiative: InitiativeResult
  conditions: CombatConditionId[]
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
  status: EncounterStatus
  startMode: EncounterStartMode
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

export type StartAdHocEncounterInput = {
  encounterId: string
  knownCombatants?: readonly EncounterCombatantInput[]
  foeGeneration?: GenerateEncounterFoesInput
  dataRoot?: string
  store?: EncounterStore
}

export type StartAdHocEncounterDeps = StartEncounterDeps & {
  generateEncounterFoes?: (
    input?: GenerateEncounterFoesInput
  ) => import('@weaver/enemy-engine').GeneratedFoeRef[]
  hydrateFoe?: (
    foe: import('@weaver/enemy-engine').GeneratedFoeRef
  ) => EncounterCombatantInput | Promise<EncounterCombatantInput>
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

export type AttemptFleeInput = EncounterLookupInput & {
  combatantId: string
  dc?: number
}

export type AttemptFleeResult = {
  success: boolean
  roll: number
  modifier: number
  total: number
  dc: number
  encounter: EncounterState
}

export type EvaluateSurrenderInput = EncounterLookupInput & {
  combatantId: string
}

export type SurrenderEvaluation = {
  eligible: boolean
  reason?: string
  hpRatio: number
  opposingCount: number
  allyCount: number
}

export type ApplySurrenderInput = EncounterLookupInput & {
  combatantId: string
  actorId?: string
}

export type ApplySurrenderResult = {
  encounter: EncounterState
}

export type ResolveNonLethalInput = EncounterLookupInput & {
  actorId: string
  targetId: string
  lootSeed: string
  lootDifficulty?: GenerateLootRequest['difficulty']
}

export type ExecuteCombatantInput = EncounterLookupInput & {
  actorId: string
  targetId: string
  lootSeed: string
  lootDifficulty?: GenerateLootRequest['difficulty']
}

export type OutcomeResolutionResult = {
  encounter: EncounterState
  loot: LootDrop[]
}

export type ResolutionPeerDeps = {
  roller?: () => number
  setNpcDefeatDisposition?: (input: SetNpcDefeatDispositionInput) => unknown
  generateLoot?: (request: GenerateLootRequest) => LootDrop[]
}

export type DefeatDispositionWrite = {
  disposition: DefeatDispositionValue
  npcId: string
  encounterId: string
  actorId: string
}
