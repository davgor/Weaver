import { createActionLockoutStore } from './lockout.js'
import { useAction, validateUse, type UseActionDeps } from './useAction.js'

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
export type SeedCatalog = {
  version: typeof SEED_CATALOG_VERSION
  effects: EffectRegistry
  actions: ActionRegistry
}
export type KnownActionStoreSnapshot = Readonly<Record<string, readonly string[]>>
export type KnownActionStore = {
  grantKnownAction: (characterId: string, actionId: string) => void
  revokeKnownAction: (characterId: string, actionId: string) => void
  listKnownActions: (characterId: string) => string[]
  knowsAction: (characterId: string, actionId: string) => boolean
  snapshot: () => KnownActionStoreSnapshot
}

export type { ActionLockoutStore } from './lockout.js'
export { createActionLockoutStore }
export type {
  AppliedEffect,
  UseActionDeps,
  UseActionFailure,
  UseActionInput,
  UseActionResult,
  UseActionSuccess,
  UseRangeInputs,
  ValidateUseFailure,
  ValidateUseInput,
  ValidateUseResult,
  ValidateUseSuccess
} from './useAction.js'
export { useAction, validateUse }

const PACKAGE_NAME = '@weaver/action-engine'
const VERSION = '0.1.0'
export const SEED_CATALOG_VERSION = 'action-seed-v1'

export const slowMovementEffect: SlowMovementEffect = createSlowMovementEffect()

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

export function createSeedCatalog(): SeedCatalog {
  return {
    version: SEED_CATALOG_VERSION,
    effects: createEffectRegistry(createSlowMovementEffect()),
    actions: createActionRegistry(createIceBoltAction(), createHamstringStrikeAction())
  }
}

export function createKnownActionStore(catalog: SeedCatalog = createSeedCatalog()): KnownActionStore {
  const knownActionIds = new Map<string, Set<string>>()

  return {
    grantKnownAction(characterId, actionId) {
      assertKnownActionInput(characterId, actionId)
      assertCatalogAction(catalog, actionId)
      getKnownActionSet(knownActionIds, characterId).add(actionId)
    },
    revokeKnownAction(characterId, actionId) {
      assertKnownActionInput(characterId, actionId)
      knownActionIds.get(characterId)?.delete(actionId)
    },
    listKnownActions(characterId) {
      assertCharacterId(characterId)
      return sortedActionIds(knownActionIds.get(characterId))
    },
    knowsAction(characterId, actionId) {
      assertKnownActionInput(characterId, actionId)
      return knownActionIds.get(characterId)?.has(actionId) ?? false
    },
    snapshot() {
      return Object.fromEntries(
        [...knownActionIds.entries()].map(([characterId, actionIds]) => [
          characterId,
          sortedActionIds(actionIds)
        ])
      )
    }
  }
}

const defaultKnownActionStore = createKnownActionStore()
const defaultLockoutStore = createActionLockoutStore()
const defaultCatalog = createSeedCatalog()

export function grantKnownAction(characterId: string, actionId: string): void {
  defaultKnownActionStore.grantKnownAction(characterId, actionId)
}

export function revokeKnownAction(characterId: string, actionId: string): void {
  defaultKnownActionStore.revokeKnownAction(characterId, actionId)
}

export function listKnownActions(characterId: string): string[] {
  return defaultKnownActionStore.listKnownActions(characterId)
}

export function knowsAction(characterId: string, actionId: string): boolean {
  return defaultKnownActionStore.knowsAction(characterId, actionId)
}

export function defaultUseActionDeps(): UseActionDeps {
  return {
    catalog: defaultCatalog,
    knownActions: defaultKnownActionStore,
    lockout: defaultLockoutStore
  }
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

function createSlowMovementEffect(): SlowMovementEffect {
  return {
    effectId: 'slow_movement',
    params: {
      feetPenalty: 10,
      durationRounds: 1
    }
  }
}

function createIceBoltAction(): ActionDefinition {
  return defineAction({
    actionId: 'ice_bolt',
    name: 'Ice Bolt',
    flavorTags: ['spell'],
    range: { kind: 'feet', amount: 30 },
    effects: [createSlowMovementEffect()],
    cost: { actionTurns: 1 }
  })
}

function createHamstringStrikeAction(): ActionDefinition {
  return defineAction({
    actionId: 'hamstring_strike',
    name: 'Hamstring Strike',
    flavorTags: ['classAction'],
    range: { kind: 'meleeWeapon' },
    effects: [createSlowMovementEffect()],
    cost: { actionTurns: 1 }
  })
}

function assertCatalogAction(catalog: SeedCatalog, actionId: string): void {
  if (!getAction(catalog.actions, actionId)) {
    throw new Error(`Unknown catalog action: ${actionId}`)
  }
}

function assertKnownActionInput(characterId: string, actionId: string): void {
  assertCharacterId(characterId)
  if (!isNonEmptyString(actionId)) {
    throw new Error('Expected a non-empty actionId')
  }
}

function assertCharacterId(characterId: string): void {
  if (!isNonEmptyString(characterId)) {
    throw new Error('Expected a non-empty characterId')
  }
}

function getKnownActionSet(
  knownActionIds: Map<string, Set<string>>,
  characterId: string
): Set<string> {
  const existing = knownActionIds.get(characterId)
  if (existing) {
    return existing
  }
  const created = new Set<string>()
  knownActionIds.set(characterId, created)
  return created
}

function sortedActionIds(actionIds: ReadonlySet<string> | undefined): string[] {
  return [...(actionIds ?? [])].sort((left, right) => left.localeCompare(right))
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
  const endpoints: EngineEndpoint[] = [
    {
      name: 'getCatalog',
      description: 'Return a deterministic fresh seed catalog',
      invoke: () => createSeedCatalog()
    },
    {
      name: 'grantKnownAction',
      description: 'Grant a known catalog action id to a character',
      invoke: (payload) => invokeGrantKnownAction(payload)
    },
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'knowsAction',
      description: 'Return whether a character knows a catalog action id',
      invoke: (payload) => invokeKnowsAction(payload)
    },
    {
      name: 'listCatalogActions',
      description: 'List deterministic seed catalog actions',
      invoke: () => listActions(createSeedCatalog().actions)
    },
    {
      name: 'listKnownActions',
      description: 'List known catalog action ids for a character',
      invoke: (payload) => invokeListKnownActions(payload)
    },
    {
      name: 'revokeKnownAction',
      description: 'Revoke a known catalog action id from a character',
      invoke: (payload) => invokeRevokeKnownAction(payload)
    },
    {
      name: 'useAction',
      description: 'Validate and apply a known action: effects + catalog Action-turn lockout',
      invoke: (payload) => invokeUseAction(payload)
    },
    {
      name: 'validateUse',
      description: 'Validate known-action gate and range without applying effects',
      invoke: (payload) => invokeValidateUse(payload)
    }
  ]
  return endpoints.sort((left, right) => left.name.localeCompare(right.name))
}

function invokeGrantKnownAction(payload: unknown): string[] {
  const { characterId, actionId } = readKnownActionPayload(payload)
  grantKnownAction(characterId, actionId)
  return listKnownActions(characterId)
}

function invokeRevokeKnownAction(payload: unknown): string[] {
  const { characterId, actionId } = readKnownActionPayload(payload)
  revokeKnownAction(characterId, actionId)
  return listKnownActions(characterId)
}

function invokeListKnownActions(payload: unknown): string[] {
  const { characterId } = readCharacterPayload(payload)
  return listKnownActions(characterId)
}

function invokeKnowsAction(payload: unknown): boolean {
  const { characterId, actionId } = readKnownActionPayload(payload)
  return knowsAction(characterId, actionId)
}

function invokeValidateUse(payload: unknown) {
  return validateUse(readUsePayload(payload), defaultUseActionDeps())
}

function invokeUseAction(payload: unknown) {
  return useAction(readUseActionPayload(payload), defaultUseActionDeps())
}

function readUsePayload(payload: unknown): {
  characterId: string
  actionId: string
  distanceFeet: number
  weaponReachFeet?: number
} {
  if (!isRecord(payload)) {
    throw new Error('Expected use payload with characterId, actionId, and distanceFeet')
  }
  if (!isNonEmptyString(payload.characterId) || !isNonEmptyString(payload.actionId)) {
    throw new Error('Expected use payload with characterId, actionId, and distanceFeet')
  }
  if (typeof payload.distanceFeet !== 'number' || !Number.isFinite(payload.distanceFeet)) {
    throw new Error('Expected use payload with characterId, actionId, and distanceFeet')
  }
  const base = {
    characterId: payload.characterId,
    actionId: payload.actionId,
    distanceFeet: payload.distanceFeet
  }
  if (payload.weaponReachFeet === undefined) {
    return base
  }
  if (typeof payload.weaponReachFeet !== 'number' || !Number.isFinite(payload.weaponReachFeet)) {
    throw new Error('Expected finite weaponReachFeet when provided')
  }
  return { ...base, weaponReachFeet: payload.weaponReachFeet }
}

function readUseActionPayload(payload: unknown) {
  const base = readUsePayload(payload)
  if (!isRecord(payload) || !Array.isArray(payload.targetIds)) {
    throw new Error('Expected useAction payload with targetIds')
  }
  if (!payload.targetIds.every(isNonEmptyString)) {
    throw new Error('Expected useAction payload with targetIds')
  }
  return { ...base, targetIds: payload.targetIds as string[] }
}

function readKnownActionPayload(payload: unknown): { characterId: string; actionId: string } {
  if (!isRecord(payload)) {
    throw new Error('Expected payload with characterId and actionId')
  }
  if (!isNonEmptyString(payload.characterId) || !isNonEmptyString(payload.actionId)) {
    throw new Error('Expected payload with characterId and actionId')
  }
  return { characterId: payload.characterId, actionId: payload.actionId }
}

function readCharacterPayload(payload: unknown): { characterId: string } {
  if (!isRecord(payload) || !isNonEmptyString(payload.characterId)) {
    throw new Error('Expected payload with characterId')
  }
  return { characterId: payload.characterId }
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
