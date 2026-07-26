import { getAbilityModifier } from '@weaver/character-engine'
import { cloneEncounter, createJsonEncounterStore } from './store.js'
import type {
  CombatConditionId,
  CombatMovementInput,
  CurrentTurnState,
  EncounterCombatant,
  EncounterCombatantInput,
  EncounterLookupInput,
  EncounterState,
  EncounterStore,
  EndTurnInput,
  StartEncounterDeps,
  StartEncounterInput,
  SubmitCombatActionInput,
  SubmitMovementInput,
  TypedCombatActionInput
} from './types.js'

type InitiativeRow = EncounterCombatant & {
  inputOrder: number
}

export function startEncounter(
  input: StartEncounterInput,
  deps: StartEncounterDeps = {}
): EncounterState {
  return persistStartedEncounter(input, 'pre-authored', deps.roller ?? rollD20)
}

export function persistStartedEncounter(
  input: StartEncounterInput,
  startMode: EncounterState['startMode'],
  roller: () => number
): EncounterState {
  assertText(input.encounterId, 'encounterId')
  const store = resolveStore(input)
  const rows = rollInitiative(input.combatants, roller)
  const turnOrder = stableTurnOrder(rows)
  const firstCombatantId = turnOrder[0]
  if (firstCombatantId === undefined) {
    throw new Error('startEncounter requires at least one combatant')
  }
  return store.saveEncounter({
    encounterId: input.encounterId,
    status: 'active',
    startMode,
    combatants: rows.map(stripInputOrder),
    turnOrder,
    currentTurnIndex: 0,
    round: 1,
    currentTurn: emptyTurn(firstCombatantId),
    turnLog: []
  })
}

export function getEncounter(input: EncounterLookupInput): EncounterState | undefined {
  assertText(input.encounterId, 'encounterId')
  const encounter = resolveStore(input).getEncounter(input.encounterId)
  return encounter === undefined ? undefined : cloneEncounter(encounter)
}

export function submitCombatAction(input: SubmitCombatActionInput): EncounterState {
  const encounter = requireActiveEncounter(input)
  assertCurrentCombatant(encounter, input.combatantId)
  if (encounter.currentTurn.actionUsed) {
    throw new Error(`${input.combatantId} has already used an Action this turn`)
  }
  const action = assertTypedAction(input.action)
  return saveTurnUpdate(input, {
    ...encounter,
    currentTurn: { ...encounter.currentTurn, actionUsed: true },
    turnLog: [
      ...encounter.turnLog,
      { kind: 'action', round: encounter.round, combatantId: input.combatantId, action }
    ]
  })
}

export function submitMovement(input: SubmitMovementInput): EncounterState {
  const encounter = requireActiveEncounter(input)
  assertCurrentCombatant(encounter, input.combatantId)
  if (encounter.currentTurn.movementUsed) {
    throw new Error(`${input.combatantId} has already used Movement this turn`)
  }
  const movement = assertMovement(input.movement)
  return saveTurnUpdate(input, {
    ...encounter,
    currentTurn: { ...encounter.currentTurn, movementUsed: true },
    turnLog: [
      ...encounter.turnLog,
      { kind: 'movement', round: encounter.round, combatantId: input.combatantId, movement }
    ]
  })
}

export function endTurn(input: EndTurnInput): EncounterState {
  const encounter = requireActiveEncounter(input)
  assertCurrentCombatant(encounter, input.combatantId)
  const nextIndex = (encounter.currentTurnIndex + 1) % encounter.turnOrder.length
  const nextCombatantId = encounter.turnOrder[nextIndex]
  if (nextCombatantId === undefined) {
    throw new Error('Encounter turn order is empty')
  }
  return saveTurnUpdate(input, {
    ...encounter,
    currentTurnIndex: nextIndex,
    round: nextIndex === 0 ? encounter.round + 1 : encounter.round,
    currentTurn: emptyTurn(nextCombatantId)
  })
}

export function resolveStore(input: EncounterLookupInput): EncounterStore {
  if (input.store !== undefined) {
    return input.store
  }
  if (input.dataRoot !== undefined) {
    return createJsonEncounterStore({ dataRoot: input.dataRoot })
  }
  throw new Error('Encounter operations require a durable dataRoot or an explicit store')
}

export function requireActiveEncounter(input: EncounterLookupInput): EncounterState {
  assertText(input.encounterId, 'encounterId')
  const encounter = resolveStore(input).getEncounter(input.encounterId)
  if (encounter === undefined) {
    throw new Error(`Encounter not found: ${input.encounterId}`)
  }
  if (encounter.status !== 'active') {
    throw new Error(`Encounter is not active: ${input.encounterId}`)
  }
  return encounter
}

export function saveEncounterUpdate(
  input: EncounterLookupInput,
  encounter: EncounterState
): EncounterState {
  return resolveStore(input).saveEncounter(encounter)
}

export function findCombatant(
  encounter: EncounterState,
  combatantId: string
): EncounterCombatant {
  const combatant = encounter.combatants.find((entry) => entry.id === combatantId)
  if (combatant === undefined) {
    throw new Error(`Combatant not found: ${combatantId}`)
  }
  return combatant
}

export function withCondition(
  combatant: EncounterCombatant,
  condition: CombatConditionId
): EncounterCombatant {
  if (combatant.conditions.includes(condition)) {
    return combatant
  }
  return { ...combatant, conditions: [...combatant.conditions, condition] }
}

export function replaceCombatant(
  encounter: EncounterState,
  next: EncounterCombatant
): EncounterState {
  return {
    ...encounter,
    combatants: encounter.combatants.map((entry) => (entry.id === next.id ? next : entry))
  }
}

function rollInitiative(
  combatants: readonly EncounterCombatantInput[],
  roller: () => number
): InitiativeRow[] {
  return combatants.map((combatant, inputOrder) => {
    assertCombatant(combatant)
    const modifier = getAbilityModifier(combatant.abilityScores.Agility)
    const roll = assertD20Roll(roller())
    return {
      ...combatant,
      conditions: [...(combatant.conditions ?? [])],
      characterConditions: [...(combatant.characterConditions ?? [])],
      damageResistances: [...(combatant.damageResistances ?? [])],
      damageVulnerabilities: [...(combatant.damageVulnerabilities ?? [])],
      initiative: { roll, modifier, total: roll + modifier },
      inputOrder
    }
  })
}

function stableTurnOrder(rows: readonly InitiativeRow[]): string[] {
  return [...rows]
    .sort(
      (left, right) =>
        right.initiative.total - left.initiative.total || left.inputOrder - right.inputOrder
    )
    .map((combatant) => combatant.id)
}

function saveTurnUpdate(input: EncounterLookupInput, encounter: EncounterState): EncounterState {
  return saveEncounterUpdate(input, encounter)
}

function assertCurrentCombatant(encounter: EncounterState, combatantId: string): void {
  assertText(combatantId, 'combatantId')
  if (encounter.currentTurn.combatantId !== combatantId) {
    throw new Error(`It is not ${combatantId}'s turn`)
  }
}

function assertTypedAction(action: TypedCombatActionInput): TypedCombatActionInput {
  if (action.type !== 'typed-action') {
    throw new Error('Combat Action input must use type "typed-action"')
  }
  assertText(action.action, 'action')
  return { type: 'typed-action', action: action.action }
}

function assertMovement(movement: CombatMovementInput): CombatMovementInput {
  assertText(movement.description, 'movement.description')
  return {
    description: movement.description,
    ...(movement.distanceFeet === undefined ? {} : { distanceFeet: movement.distanceFeet })
  }
}

function assertCombatant(combatant: EncounterCombatantInput): void {
  assertText(combatant.id, 'combatant.id')
  if (!Number.isFinite(combatant.abilityScores.Agility)) {
    throw new Error(`${combatant.id} requires an Agility score`)
  }
}

function assertD20Roll(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new Error(`D20 roller returned invalid roll: ${roll}`)
  }
  return roll
}

function emptyTurn(combatantId: string): CurrentTurnState {
  return { combatantId, actionUsed: false, movementUsed: false }
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function stripInputOrder(row: InitiativeRow): EncounterCombatant {
  return {
    id: row.id,
    kind: row.kind,
    abilityScores: { ...row.abilityScores },
    initiative: { ...row.initiative },
    conditions: [...row.conditions],
    characterConditions: [...row.characterConditions],
    damageResistances: [...row.damageResistances],
    damageVulnerabilities: [...row.damageVulnerabilities],
    ...(row.displayName === undefined ? {} : { displayName: row.displayName }),
    ...(row.hp === undefined ? {} : { hp: { ...row.hp } }),
    ...(row.armorClass === undefined ? {} : { armorClass: row.armorClass }),
    ...(row.dying === undefined ? {} : { dying: row.dying === null ? null : { ...row.dying } })
  }
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}
