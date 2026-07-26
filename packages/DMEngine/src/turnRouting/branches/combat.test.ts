import { describe, expect, it } from 'vitest'
import {
  createActionLockoutStore,
  createKnownActionStore,
  createSeedCatalog,
  useAction
} from '@weaver/action-engine'
import {
  applySurrender,
  attemptFlee,
  createMemoryEncounterStore,
  executeHelplessCombatant,
  getEncounter,
  resolveAttack,
  resolveNonLethalVictory,
  startEncounter,
  submitCombatAction,
  type EncounterStore
} from '@weaver/combat-engine'
import type { WeaponDamageProfile } from '@weaver/item-engine'
import { resolveCombatBranch } from './combat.js'
import type { CombatBranchInput, CombatTurnApi } from '../types.js'

const WEAPON: WeaponDamageProfile = {
  damageComponents: [{ damageType: 'Physical', amount: 6 }],
  onHitEffectIds: []
}

describe('resolveCombatBranch attack orchestration', () => {
  it('resolves attacks through CombatEngine resolveAttack and updates HP', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-attack')
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-attack',
        combatantId: 'hero',
        combatIntent: {
          kind: 'attack',
          targetId: 'goblin',
          weaponInstanceId: 'weapon.sword',
          attackAbility: 'Body',
          proficient: true,
          proficiencyBonus: 2
        }
      })
    )

    expect(result.kind).toBe('combat')
    if (result.kind !== 'combat') return
    expect(result.outcome.type).toBe('attack')
    if (result.outcome.type !== 'attack') return
    expect(result.outcome.hit).toBe(true)
    expect(result.outcome.totalDamage).toBeGreaterThan(0)
    const goblin = result.encounter.combatants.find((c) => c.id === 'goblin')
    expect(goblin?.hp?.current).toBeLessThan(12)
  })
})

describe('resolveCombatBranch flee and surrender', () => {
  it('flees through CombatEngine attemptFlee', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-flee')
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-flee',
        combatantId: 'hero',
        combatIntent: { kind: 'flee' },
        fleeRoller: () => 20
      })
    )
    expect(result).toMatchObject({
      kind: 'combat',
      outcome: { type: 'flee', success: true }
    })
  })

  it('applies surrender through CombatEngine applySurrender', () => {
    const store = createMemoryEncounterStore()
    seedHopeless(store, 'enc-yield')
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-yield',
        combatantId: 'goblin',
        combatIntent: { kind: 'surrender' }
      })
    )
    expect(result.kind).toBe('combat')
    if (result.kind !== 'combat') return
    expect(result.outcome.type).toBe('surrender')
    const goblin = result.encounter.combatants.find((c) => c.id === 'goblin')
    expect(goblin?.conditions).toContain('surrendered')
  })
})

describe('resolveCombatBranch execute and non-lethal', () => {
  it('executes a helpless foe and returns loot facts', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-exec', { goblinConditions: ['helpless'] })
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-exec',
        combatantId: 'hero',
        combatIntent: {
          kind: 'execute',
          targetId: 'goblin',
          lootSeed: 'exec.seed'
        }
      })
    )
    expect(result.kind).toBe('combat')
    if (result.kind !== 'combat') return
    expect(result.outcome.type).toBe('execute')
    if (result.outcome.type !== 'execute') return
    expect(result.outcome.loot.length).toBeGreaterThan(0)
  })

  it('resolves non-lethal victory with loot facts', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-nl')
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-nl',
        combatantId: 'hero',
        combatIntent: {
          kind: 'nonLethal',
          targetId: 'goblin',
          lootSeed: 'nl.seed'
        }
      })
    )
    expect(result).toMatchObject({
      kind: 'combat',
      outcome: { type: 'nonLethal' }
    })
    if (result.kind !== 'combat' || result.outcome.type !== 'nonLethal') return
    expect(result.outcome.loot.length).toBeGreaterThan(0)
    const goblin = result.encounter.combatants.find((c) => c.id === 'goblin')
    expect(goblin?.conditions).toContain('down')
  })
})

describe('resolveCombatBranch ActionEngine use', () => {
  it('uses ActionEngine use/lockout before marking the combat action', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-action')
    const catalog = createSeedCatalog()
    const knownActions = createKnownActionStore(catalog)
    knownActions.grantKnownAction('hero', 'ice_bolt')
    const lockout = createActionLockoutStore()
    const actions = {
      useAction: (input: Parameters<typeof useAction>[0]) =>
        useAction(input, { catalog, knownActions, lockout })
    }

    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-action',
        combatantId: 'hero',
        combatIntent: {
          kind: 'action',
          actionId: 'ice_bolt',
          targetIds: ['goblin'],
          distanceFeet: 30
        },
        actions
      })
    )

    expect(result.kind).toBe('combat')
    if (result.kind !== 'combat') return
    expect(result.outcome).toMatchObject({
      type: 'action',
      actionId: 'ice_bolt',
      lockout: { actionTurns: expect.any(Number) }
    })
    expect(lockout.getRemainingActionTurns('hero')).toBeGreaterThan(0)
    expect(getEncounter({ encounterId: 'enc-action', store })?.currentTurn.actionUsed).toBe(true)
  })
})

describe('resolveCombatBranch ActionEngine lockout', () => {
  it('rejects lockout-blocked actions without mutating the encounter action flag', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-blocked')
    const catalog = createSeedCatalog()
    const knownActions = createKnownActionStore(catalog)
    knownActions.grantKnownAction('hero', 'ice_bolt')
    const lockout = createActionLockoutStore()
    lockout.applyLockout('hero', 2)
    const actions = {
      useAction: (input: Parameters<typeof useAction>[0]) =>
        useAction(input, { catalog, knownActions, lockout })
    }

    expect(() =>
      resolveCombatBranch(
        branchInput(store, {
          encounterId: 'enc-blocked',
          combatantId: 'hero',
          combatIntent: {
            kind: 'action',
            actionId: 'ice_bolt',
            targetIds: ['goblin'],
            distanceFeet: 30
          },
          actions
        })
      )
    ).toThrow(/lockout|not known|Unknown/i)
    expect(getEncounter({ encounterId: 'enc-blocked', store })?.currentTurn.actionUsed).toBe(false)
  })
})

describe('resolveCombatBranch typed fallback', () => {
  it('keeps typed-action logging when no structured combatIntent is provided', () => {
    const store = createMemoryEncounterStore()
    seedDuo(store, 'enc-typed')
    const result = resolveCombatBranch(
      branchInput(store, {
        encounterId: 'enc-typed',
        combatantId: 'hero',
        combatAction: 'Swing wildly'
      })
    )
    expect(result).toMatchObject({
      kind: 'combat',
      outcome: { type: 'typed', action: 'Swing wildly' }
    })
    expect(getEncounter({ encounterId: 'enc-typed', store })?.currentTurn.actionUsed).toBe(true)
  })
})

function branchInput(
  store: EncounterStore,
  options: {
    encounterId: string
    combatantId: string
    combatAction?: string
    combatIntent?: CombatBranchInput['combatIntent']
    actions?: CombatBranchInput['actions']
    fleeRoller?: () => number
  }
): CombatBranchInput {
  const input: CombatBranchInput = {
    combat: combatApi(store, options.fleeRoller),
    encounterId: options.encounterId,
    combatantId: options.combatantId
  }
  if (options.combatAction !== undefined) input.combatAction = options.combatAction
  if (options.combatIntent !== undefined) input.combatIntent = options.combatIntent
  if (options.actions !== undefined) input.actions = options.actions
  return input
}

function combatApi(store: EncounterStore, fleeRoller?: () => number): CombatTurnApi {
  return {
    getEncounter: (encounterId) => getEncounter({ encounterId, store }),
    startEncounter: () => fail('startEncounter'),
    startAdHocEncounter: () => fail('startAdHocEncounter'),
    resolveEncounter: () => fail('resolveEncounter'),
    submitCombatAction: (input) => submitCombatAction({ ...input, store }),
    resolveAttack: (input) =>
      resolveAttack(
        { ...input, store },
        { roller: () => 18, getWeaponDamageProfile: () => WEAPON }
      ),
    attemptFlee: (input) =>
      attemptFlee({ ...input, store }, { roller: fleeRoller ?? (() => 20) }),
    applySurrender: (input) => applySurrender({ ...input, store }),
    resolveNonLethalVictory: (input) => resolveNonLethalVictory({ ...input, store }),
    executeHelplessCombatant: (input) => executeHelplessCombatant({ ...input, store })
  }
}

function fail(name: string): never {
  throw new Error(`${name} should not run`)
}

function seedDuo(
  store: EncounterStore,
  encounterId: string,
  options: { goblinConditions?: string[] } = {}
): void {
  const encounter = startEncounter(
    {
      encounterId,
      combatants: [
        {
          id: 'hero',
          kind: 'character',
          abilityScores: { Body: 14, Agility: 12, Mind: 10, Presence: 10 },
          hp: { current: 20, max: 20 }
        },
        {
          id: 'goblin',
          kind: 'enemy',
          abilityScores: { Body: 10, Agility: 10, Mind: 8, Presence: 8 },
          hp: { current: 12, max: 12 },
          conditions: options.goblinConditions ?? []
        }
      ],
      store
    },
    { roller: () => 15 }
  )
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: encounter.turnOrder.indexOf('hero'),
    currentTurn: { combatantId: 'hero', actionUsed: false, movementUsed: false },
    combatants: encounter.combatants.map((c) =>
      c.id === 'goblin'
        ? { ...c, conditions: [...(options.goblinConditions ?? [])], hp: { current: 12, max: 12 } }
        : c
    )
  })
}

function seedHopeless(store: EncounterStore, encounterId: string): void {
  const encounter = startEncounter(
    {
      encounterId,
      combatants: [
        {
          id: 'hero-a',
          kind: 'character',
          abilityScores: { Body: 14, Agility: 12, Mind: 10, Presence: 10 },
          hp: { current: 20, max: 20 }
        },
        {
          id: 'hero-b',
          kind: 'character',
          abilityScores: { Body: 14, Agility: 12, Mind: 10, Presence: 10 },
          hp: { current: 20, max: 20 }
        },
        {
          id: 'goblin',
          kind: 'enemy',
          abilityScores: { Body: 10, Agility: 10, Mind: 8, Presence: 8 },
          hp: { current: 2, max: 20 }
        }
      ],
      store
    },
    { roller: () => 15 }
  )
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: encounter.turnOrder.indexOf('goblin'),
    currentTurn: { combatantId: 'goblin', actionUsed: false, movementUsed: false },
    combatants: encounter.combatants.map((c) =>
      c.id === 'goblin' ? { ...c, hp: { current: 2, max: 20 } } : c
    )
  })
}
