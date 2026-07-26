import { describe, expect, it } from 'vitest'
import {
  type ActionDefinition,
  actionEngine,
  actionsAreMechanicallyEqual,
  createActionRegistry,
  createEffectRegistry,
  deleteAction,
  defineAction,
  defineEffect,
  getAction,
  getEffect,
  isValidActionDefinition,
  isValidRange,
  listActionsByEffect,
  listActions,
  putAction,
  slowMovementEffect
} from './index.js'

function slowAction(overrides: Partial<ActionDefinition> = {}): ActionDefinition {
  return defineAction({
    actionId: 'ice_bolt',
    name: 'Ice Bolt',
    flavorTags: ['spell'],
    range: { kind: 'feet', amount: 30 },
    effects: [{ effectId: 'slow_movement', params: { feetPenalty: 10, durationRounds: 1 } }],
    cost: { actionTurns: 1 },
    ...overrides
  })
}

describe('@weaver/action-engine surface', () => {
  it('reports healthy', () => {
    const health = actionEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/action-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = actionEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((endpoint) => endpoint.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await actionEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/action-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await actionEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/action-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(actionEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })
})

describe('@weaver/action-engine effects and ranges', () => {
  it('defines and gets effects by effectId with typed slow movement params', () => {
    const registry = defineEffect(createEffectRegistry(), slowMovementEffect)
    const effect = getEffect(registry, 'slow_movement')

    expect(effect).toEqual(slowMovementEffect)
    expect(effect.params).toEqual({ feetPenalty: 10, durationRounds: 1 })
  })

  it('validates fixed-feet and melee-weapon ranges only', () => {
    expect(isValidRange({ kind: 'feet', amount: 30 })).toBe(true)
    expect(isValidRange({ kind: 'meleeWeapon' })).toBe(true)
    expect(isValidRange({ kind: 'feet', amount: 0 })).toBe(false)
    expect(isValidRange({ kind: 'feet', amount: Number.NaN })).toBe(false)
    expect(isValidRange({ kind: 'meleeWeapon', amount: 5 })).toBe(false)
    expect(isValidRange({ kind: 'spell', amount: 30 })).toBe(false)
  })
})

describe('@weaver/action-engine action definitions', () => {
  it('keeps spell and class action ranges on the same union', () => {
    const rangedAction = slowAction()
    const meleeAction = slowAction({
      actionId: 'hamstring_strike',
      name: 'Hamstring Strike',
      flavorTags: ['classAction'],
      range: { kind: 'meleeWeapon' }
    })

    expect(isValidActionDefinition(rangedAction)).toBe(true)
    expect(isValidActionDefinition(meleeAction)).toBe(true)
  })

  it('ignores flavor-only changes for mechanical equality', () => {
    const baseAction = slowAction()
    const reflavoredAction = slowAction({
      actionId: 'slow_attack',
      name: 'Slow Attack',
      flavorTags: ['classAction', 'martial']
    })

    expect(actionsAreMechanicallyEqual(baseAction, reflavoredAction)).toBe(true)
    expect(isValidActionDefinition(baseAction)).toBe(isValidActionDefinition(reflavoredAction))
  })
})

describe('@weaver/action-engine action registry', () => {
  it('stores distinct actions that share the same effect id', () => {
    const iceBolt = slowAction()
    const hamstringStrike = slowAction({
      actionId: 'hamstring_strike',
      name: 'Hamstring Strike',
      flavorTags: ['classAction'],
      range: { kind: 'meleeWeapon' }
    })
    const registry = putAction(
      putAction(createActionRegistry(), iceBolt),
      hamstringStrike
    )

    const storedIceBolt = getAction(registry, 'ice_bolt')
    const storedHamstringStrike = getAction(registry, 'hamstring_strike')

    expect(storedIceBolt?.actionId).toBe('ice_bolt')
    expect(storedHamstringStrike?.actionId).toBe('hamstring_strike')
    expect(storedIceBolt?.effects[0]?.effectId).toBe(storedHamstringStrike?.effects[0]?.effectId)
    expect(listActionsByEffect(registry, 'slow_movement')).toHaveLength(2)
    expect(listActions(registry).map((action) => action.actionId)).toEqual([
      'hamstring_strike',
      'ice_bolt'
    ])
  })

  it('deletes actions from the registry without mutating the original registry', () => {
    const action = slowAction()
    const registry = putAction(createActionRegistry(), action)
    const updated = deleteAction(registry, 'ice_bolt')

    expect(getAction(registry, 'ice_bolt')).toBeDefined()
    expect(getAction(updated, 'ice_bolt')).toBeUndefined()
  })
})
