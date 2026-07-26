export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type ActionEngineApi = {
  id: 'ActionEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

export type FeetRange = {
  kind: 'feet'
  amount: number
}

export type MeleeWeaponRange = {
  kind: 'meleeWeapon'
}

export type ActionRange = FeetRange | MeleeWeaponRange

export type SlowMovementParams = {
  feetPenalty: number
  durationRounds: number
}

export type SlowMovementEffect = {
  effectId: 'slow_movement'
  params: SlowMovementParams
}

export type EffectDefinition = SlowMovementEffect
export type ActionEffect = EffectDefinition
export type FlavorTag = 'spell' | 'classAction' | (string & {})

export type ActionCost = {
  actionTurns: number
}

export type ActionDefinition = {
  actionId: string
  name: string
  flavorTags: readonly FlavorTag[]
  range: ActionRange
  effects: readonly ActionEffect[]
  cost: ActionCost
}

export type EffectRegistry = Readonly<Record<string, EffectDefinition>>
export type ActionRegistry = Readonly<Record<string, ActionDefinition>>

const PACKAGE_NAME = '@weaver/action-engine'
const VERSION = '0.1.0'

export const slowMovementEffect: SlowMovementEffect = {
  effectId: 'slow_movement',
  params: {
    feetPenalty: 10,
    durationRounds: 1
  }
}

export function createEffectRegistry(...effects: readonly EffectDefinition[]): EffectRegistry {
  return effects.reduce(defineEffect, {})
}

export function defineEffect(
  registry: EffectRegistry,
  effect: EffectDefinition
): EffectRegistry {
  if (!isValidEffectDefinition(effect)) {
    throw new Error('Invalid effect definition')
  }
  return { ...registry, [effect.effectId]: cloneEffect(effect) }
}

export function getEffect(
  registry: EffectRegistry,
  effectId: string
): EffectDefinition | undefined {
  return registry[effectId]
}

export function createActionRegistry(...actions: readonly ActionDefinition[]): ActionRegistry {
  return actions.reduce(putAction, {})
}

export function defineAction(action: ActionDefinition): ActionDefinition {
  if (!isValidActionDefinition(action)) {
    throw new Error('Invalid action definition')
  }
  return cloneAction(action)
}

export function putAction(
  registry: ActionRegistry,
  action: ActionDefinition
): ActionRegistry {
  return { ...registry, [action.actionId]: defineAction(action) }
}

export function getAction(
  registry: ActionRegistry,
  actionId: string
): ActionDefinition | undefined {
  return registry[actionId]
}

export function deleteAction(registry: ActionRegistry, actionId: string): ActionRegistry {
  const { [actionId]: _deleted, ...remaining } = registry
  return remaining
}

export function listActions(registry: ActionRegistry): ActionDefinition[] {
  return Object.values(registry).sort((left, right) => left.actionId.localeCompare(right.actionId))
}

export function listActionsByEffect(
  registry: ActionRegistry,
  effectId: string
): ActionDefinition[] {
  return listActions(registry).filter((action) =>
    action.effects.some((effect) => effect.effectId === effectId)
  )
}

export function isValidRange(value: unknown): value is ActionRange {
  if (!isRecord(value)) {
    return false
  }
  if (value.kind === 'feet') {
    return hasOnlyKeys(value, ['amount', 'kind']) && isPositiveFiniteNumber(value.amount)
  }
  if (value.kind === 'meleeWeapon') {
    return hasOnlyKeys(value, ['kind'])
  }
  return false
}

export function isValidActionDefinition(value: unknown): value is ActionDefinition {
  if (!isRecord(value)) {
    return false
  }
  return (
    isNonEmptyString(value.actionId) &&
    isNonEmptyString(value.name) &&
    isFlavorTags(value.flavorTags) &&
    isValidRange(value.range) &&
    isEffects(value.effects) &&
    isValidCost(value.cost)
  )
}

export function actionsAreMechanicallyEqual(
  left: ActionDefinition,
  right: ActionDefinition
): boolean {
  return (
    JSON.stringify(mechanicsOf(left)) === JSON.stringify(mechanicsOf(right)) &&
    isValidActionDefinition(left) === isValidActionDefinition(right)
  )
}

function isValidEffectDefinition(value: unknown): value is EffectDefinition {
  return isRecord(value) && value.effectId === 'slow_movement' && isSlowMovementParams(value.params)
}

function isSlowMovementParams(value: unknown): value is SlowMovementParams {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['durationRounds', 'feetPenalty']) &&
    isPositiveFiniteNumber(value.feetPenalty) &&
    isPositiveFiniteNumber(value.durationRounds)
  )
}

function isValidCost(value: unknown): value is ActionCost {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['actionTurns']) &&
    isPositiveInteger(value.actionTurns)
  )
}

function isEffects(value: unknown): value is readonly ActionEffect[] {
  return Array.isArray(value) && value.length > 0 && value.every(isValidEffectDefinition)
}

function isFlavorTags(value: unknown): value is readonly FlavorTag[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && isPositiveFiniteNumber(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return JSON.stringify(actual) === JSON.stringify(sortedExpected)
}

function cloneAction(action: ActionDefinition): ActionDefinition {
  return {
    actionId: action.actionId,
    name: action.name,
    flavorTags: [...action.flavorTags],
    range: cloneRange(action.range),
    effects: action.effects.map(cloneEffect),
    cost: { actionTurns: action.cost.actionTurns }
  }
}

function cloneRange(range: ActionRange): ActionRange {
  if (range.kind === 'feet') {
    return { kind: 'feet', amount: range.amount }
  }
  return { kind: 'meleeWeapon' }
}

function cloneEffect(effect: EffectDefinition): EffectDefinition {
  return {
    effectId: 'slow_movement',
    params: {
      feetPenalty: effect.params.feetPenalty,
      durationRounds: effect.params.durationRounds
    }
  }
}

function mechanicsOf(action: ActionDefinition): Pick<ActionDefinition, 'cost' | 'effects' | 'range'> {
  return {
    range: cloneRange(action.range),
    effects: action.effects.map(cloneEffect),
    cost: { actionTurns: action.cost.actionTurns }
  }
}

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    }
  ]
}

export const actionEngine: ActionEngineApi = {
  id: 'ActionEngine',
  title: 'Action Engine',
  description: 'Deterministic abilities, effects, ranges, and Action-turn costs',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((candidate) => candidate.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}
