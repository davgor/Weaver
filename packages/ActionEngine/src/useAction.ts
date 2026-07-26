import type { ActionDefinition, ActionEffect, KnownActionStore, SeedCatalog } from './index.js'
import type { ActionLockoutStore } from './lockout.js'

export type UseRangeInputs = {
  distanceFeet: number
  weaponReachFeet?: number
}

export type ValidateUseInput = UseRangeInputs & {
  characterId: string
  actionId: string
  /** LLM-proposed cost — ignored; catalog cost wins */
  cost?: unknown
  /** LLM-proposed range — ignored; catalog range wins */
  range?: unknown
  actionTurns?: unknown
  effects?: unknown
  effectMagnitudes?: unknown
}

export type ValidateUseSuccess = {
  ok: true
  action: ActionDefinition
}

export type ValidateUseFailure = {
  ok: false
  reason: string
}

export type ValidateUseResult = ValidateUseSuccess | ValidateUseFailure

export type AppliedEffect = {
  targetId: string
  effectId: ActionEffect['effectId']
  params: ActionEffect['params']
}

export type UseActionInput = ValidateUseInput & {
  targetIds: readonly string[]
}

export type UseActionSuccess = {
  ok: true
  actionId: string
  appliedEffects: AppliedEffect[]
  lockout: { actionTurns: number }
}

export type UseActionFailure = {
  ok: false
  reason: string
}

export type UseActionResult = UseActionSuccess | UseActionFailure

export type UseActionDeps = {
  catalog: SeedCatalog
  knownActions: Pick<KnownActionStore, 'knowsAction'>
  lockout: ActionLockoutStore
}

export function validateUse(input: ValidateUseInput, deps: UseActionDeps): ValidateUseResult {
  void input.cost
  void input.range
  void input.actionTurns
  void input.effects
  void input.effectMagnitudes

  const gated = gateKnownAction(input, deps)
  if (!gated.ok) {
    return gated
  }
  if (deps.lockout.getRemainingActionTurns(input.characterId) > 0) {
    return { ok: false, reason: 'Action-turn lockout is active' }
  }
  const rangeCheck = checkRange(gated.action, input)
  if (!rangeCheck.ok) {
    return rangeCheck
  }
  return { ok: true, action: gated.action }
}

export function useAction(input: UseActionInput, deps: UseActionDeps): UseActionResult {
  const validated = validateUse(input, deps)
  if (!validated.ok) {
    return validated
  }
  if (input.targetIds.length === 0) {
    return { ok: false, reason: 'Expected at least one targetId' }
  }

  const appliedEffects = applyEffectsToTargets(validated.action.effects, input.targetIds)
  const actionTurns = validated.action.cost.actionTurns
  deps.lockout.applyLockout(input.characterId, actionTurns)

  return {
    ok: true,
    actionId: validated.action.actionId,
    appliedEffects,
    lockout: { actionTurns }
  }
}

function gateKnownAction(
  input: ValidateUseInput,
  deps: UseActionDeps
): ValidateUseSuccess | ValidateUseFailure {
  if (!isNonEmptyString(input.characterId) || !isNonEmptyString(input.actionId)) {
    return { ok: false, reason: 'Expected characterId and actionId' }
  }
  const action = deps.catalog.actions[input.actionId]
  if (action === undefined) {
    return { ok: false, reason: `Unknown action id: ${input.actionId}` }
  }
  if (!deps.knownActions.knowsAction(input.characterId, input.actionId)) {
    return { ok: false, reason: `Action not known to character: ${input.actionId}` }
  }
  return { ok: true, action }
}

function checkRange(
  action: ActionDefinition,
  input: UseRangeInputs
): ValidateUseSuccess | ValidateUseFailure {
  if (!isNonNegativeFiniteNumber(input.distanceFeet)) {
    return { ok: false, reason: 'Expected non-negative distanceFeet' }
  }
  if (action.range.kind === 'feet') {
    if (input.distanceFeet > action.range.amount) {
      return { ok: false, reason: 'Target is out of range' }
    }
    return { ok: true, action }
  }
  return checkMeleeWeaponRange(action, input)
}

function checkMeleeWeaponRange(
  action: ActionDefinition,
  input: UseRangeInputs
): ValidateUseSuccess | ValidateUseFailure {
  if (input.weaponReachFeet === undefined) {
    return { ok: false, reason: 'meleeWeapon range requires weaponReachFeet from Item/Combat' }
  }
  if (!isPositiveFiniteNumber(input.weaponReachFeet)) {
    return { ok: false, reason: 'Expected positive weaponReachFeet' }
  }
  if (input.distanceFeet > input.weaponReachFeet) {
    return { ok: false, reason: 'Target is out of weapon reach' }
  }
  return { ok: true, action }
}

function applyEffectsToTargets(
  effects: readonly ActionEffect[],
  targetIds: readonly string[]
): AppliedEffect[] {
  const applied: AppliedEffect[] = []
  for (const targetId of targetIds) {
    for (const effect of effects) {
      applied.push({
        targetId,
        effectId: effect.effectId,
        params: { ...effect.params }
      })
    }
  }
  return applied
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}
