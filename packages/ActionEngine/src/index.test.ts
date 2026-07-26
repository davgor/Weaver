import { describe, expect, it } from 'vitest'
import {
  type ActionDefinition,
  type KnownActionStoreSnapshot,
  actionEngine,
  actionsAreMechanicallyEqual,
  createActionRegistry,
  createEffectRegistry,
  createKnownActionStore,
  createSeedCatalog,
  deleteAction,
  defineAction,
  defineEffect,
  grantKnownAction,
  getAction,
  getEffect,
  isValidActionDefinition,
  isValidRange,
  knowsAction,
  listActionsByEffect,
  listActions,
  listKnownActions,
  putAction,
  revokeKnownAction,
  SEED_CATALOG_VERSION,
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

describe('@weaver/action-engine seed catalog', () => {
  it('seeds slow movement plus Ice Bolt and Hamstring Strike with a shared effect id', () => {
    const catalog = createSeedCatalog()
    const iceBolt = getAction(catalog.actions, 'ice_bolt')
    const hamstringStrike = getAction(catalog.actions, 'hamstring_strike')

    expect(catalog.version).toBe(SEED_CATALOG_VERSION)
    expect(getEffect(catalog.effects, 'slow_movement')).toEqual(slowMovementEffect)
    expect(iceBolt).toMatchObject({
      actionId: 'ice_bolt',
      name: 'Ice Bolt',
      flavorTags: ['spell'],
      range: { kind: 'feet', amount: 30 }
    })
    expect(hamstringStrike).toMatchObject({
      actionId: 'hamstring_strike',
      name: 'Hamstring Strike',
      flavorTags: ['classAction'],
      range: { kind: 'meleeWeapon' }
    })
    expect(iceBolt?.effects[0]?.effectId).toBe('slow_movement')
    expect(hamstringStrike?.effects[0]?.effectId).toBe(iceBolt?.effects[0]?.effectId)
  })

  it('creates deterministic fresh seed registries across calls', () => {
    const firstSeed = createSeedCatalog()
    const secondSeed = createSeedCatalog()

    expect(secondSeed).toEqual(firstSeed)
    expect(secondSeed).not.toBe(firstSeed)
    expect(secondSeed.actions).not.toBe(firstSeed.actions)
    expect(listActions(secondSeed.actions).map((action) => action.actionId)).toEqual([
      'hamstring_strike',
      'ice_bolt'
    ])
  })
})

describe('@weaver/action-engine known actions', () => {
  it('grants, revokes, lists, and queries catalog action ids per character', () => {
    const store = createKnownActionStore(createSeedCatalog())

    store.grantKnownAction('character-1', 'ice_bolt')
    store.grantKnownAction('character-1', 'hamstring_strike')
    store.grantKnownAction('character-1', 'ice_bolt')

    expect(store.knowsAction('character-1', 'ice_bolt')).toBe(true)
    expect(store.listKnownActions('character-1')).toEqual(['hamstring_strike', 'ice_bolt'])

    store.revokeKnownAction('character-1', 'ice_bolt')

    expect(store.knowsAction('character-1', 'ice_bolt')).toBe(false)
    expect(store.listKnownActions('character-1')).toEqual(['hamstring_strike'])
  })

  it('fails closed when granting an action id outside the catalog', () => {
    const store = createKnownActionStore(createSeedCatalog())

    expect(() => store.grantKnownAction('character-1', 'invented_spell')).toThrow(
      /Unknown catalog action/
    )
    expect(store.listKnownActions('character-1')).toEqual([])
  })

  it('stores ids only without copying action definitions onto characters', () => {
    const store = createKnownActionStore(createSeedCatalog())

    store.grantKnownAction('character-1', 'ice_bolt')

    const snapshot: KnownActionStoreSnapshot = store.snapshot()
    expect(snapshot['character-1']).toEqual(['ice_bolt'])
    expect(JSON.stringify(snapshot)).not.toContain('feetPenalty')
    expect(JSON.stringify(snapshot)).not.toContain('range')
  })

  it('exports default in-memory helpers for callers that do not need a custom store', () => {
    const characterId = 'test-default-character'

    revokeKnownAction(characterId, 'ice_bolt')
    grantKnownAction(characterId, 'ice_bolt')

    expect(knowsAction(characterId, 'ice_bolt')).toBe(true)
    expect(listKnownActions(characterId)).toContain('ice_bolt')

    revokeKnownAction(characterId, 'ice_bolt')
  })
})

describe('@weaver/action-engine catalog and known-action endpoints', () => {
  it('lists seed catalog and known-action endpoints', () => {
    const endpointNames = actionEngine.listEndpoints().map((endpoint) => endpoint.name)

    expect(endpointNames).toEqual([
      'getCatalog',
      'grantKnownAction',
      'health',
      'knowsAction',
      'listCatalogActions',
      'listKnownActions',
      'revokeKnownAction',
      'useAction',
      'validateUse'
    ])
  })

  it('invokes catalog endpoints against the deterministic seed', async () => {
    const catalog = await actionEngine.call('getCatalog')
    const actions = await actionEngine.call('listCatalogActions')

    expect(catalog).toMatchObject({ version: SEED_CATALOG_VERSION })
    expect(actions).toMatchObject([
      { actionId: 'hamstring_strike' },
      { actionId: 'ice_bolt' }
    ])
  })

  it('invokes known-action grant, list, query, and revoke endpoints', async () => {
    const characterId = 'endpoint-character'

    await actionEngine.call('revokeKnownAction', { characterId, actionId: 'ice_bolt' })
    await actionEngine.call('grantKnownAction', { characterId, actionId: 'ice_bolt' })

    await expect(actionEngine.call('listKnownActions', { characterId })).resolves.toEqual([
      'ice_bolt'
    ])
    await expect(
      actionEngine.call('knowsAction', { characterId, actionId: 'ice_bolt' })
    ).resolves.toBe(true)

    await actionEngine.call('revokeKnownAction', { characterId, actionId: 'ice_bolt' })

    await expect(
      actionEngine.call('knowsAction', { characterId, actionId: 'ice_bolt' })
    ).resolves.toBe(false)
  })
})
