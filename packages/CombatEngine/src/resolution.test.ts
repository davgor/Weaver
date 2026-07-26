import { describe, expect, it } from 'vitest'
import {
  applySurrender,
  attemptFlee,
  createMemoryEncounterStore,
  evaluateSurrender,
  executeHelplessCombatant,
  resolveNonLethalVictory,
  startEncounter,
  type EncounterCombatantInput,
  type EncounterStore
} from './index.js'

describe('CombatEngine flee resolution', () => {
  it('rejects flee when the combatant is restrained or stunned', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-flee-blocked',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit', conditions: ['restrained'] })],
      firstId: 'bandit'
    })
    expect(() =>
      attemptFlee({ encounterId: 'enc-flee-blocked', combatantId: 'bandit', store })
    ).toThrow(/restrained|stunned|not eligible/i)
  })

  it('rolls flee success and updates encounter state on success', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-flee-ok',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit' })],
      firstId: 'bandit'
    })
    const result = attemptFlee(
      { encounterId: 'enc-flee-ok', combatantId: 'bandit', store },
      { roller: () => 18 }
    )
    expect(result.success).toBe(true)
    expect(result.roll).toBe(18)
    expect(result.encounter.combatants.find((c) => c.id === 'bandit')?.conditions).toContain('fled')
    expect(result.encounter.turnOrder).not.toContain('bandit')
  })

  it('records flee failure without removing the combatant', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-flee-fail',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit' })],
      firstId: 'bandit'
    })
    const result = attemptFlee(
      { encounterId: 'enc-flee-fail', combatantId: 'bandit', store },
      { roller: () => 2 }
    )
    expect(result.success).toBe(false)
    expect(result.encounter.combatants.find((c) => c.id === 'bandit')?.conditions).not.toContain(
      'fled'
    )
    expect(result.encounter.turnOrder).toContain('bandit')
  })
})

describe('CombatEngine surrender eligibility', () => {
  it('allows surrender only under low HP and hopeless odds', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-yield',
      combatants: [
        hero({ id: 'hero-a' }),
        hero({ id: 'hero-b' }),
        enemy({ id: 'bandit', hp: { current: 2, max: 20 } })
      ],
      firstId: 'bandit'
    })
    expect(evaluateSurrender({ encounterId: 'enc-yield', combatantId: 'bandit', store })).toMatchObject(
      { eligible: true }
    )
    const yielded = applySurrender({ encounterId: 'enc-yield', combatantId: 'bandit', store })
    expect(yielded.encounter.combatants.find((c) => c.id === 'bandit')?.conditions).toContain(
      'surrendered'
    )
    expect(yielded.encounter.status).toBe('resolved')
  })
})

describe('CombatEngine surrender rejection', () => {
  it('rejects surrender when HP is high or odds are even', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-no-yield',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit', hp: { current: 18, max: 20 } })],
      firstId: 'bandit'
    })
    expect(
      evaluateSurrender({ encounterId: 'enc-no-yield', combatantId: 'bandit', store }).eligible
    ).toBe(false)
    expect(() =>
      applySurrender({ encounterId: 'enc-no-yield', combatantId: 'bandit', store })
    ).toThrow(/not eligible|surrender/i)
  })
})

describe('CombatEngine non-lethal victory', () => {
  it('ends a foe at 0 HP down when the attacker chooses non-lethal resolution', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-nonlethal',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit', hp: { current: 3, max: 12 } })],
      firstId: 'hero'
    })
    const result = resolveNonLethalVictory({
      encounterId: 'enc-nonlethal',
      actorId: 'hero',
      targetId: 'bandit',
      store,
      lootSeed: 'nonlethal.seed'
    })
    const target = result.encounter.combatants.find((c) => c.id === 'bandit')
    expect(target?.hp).toEqual({ current: 0, max: 12 })
    expect(target?.conditions).toContain('down')
    expect(result.loot.length).toBeGreaterThan(0)
    expect(result.encounter.status).toBe('resolved')
  })

  it('never auto-executes a downed foe as a side effect of non-lethal victory', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-no-auto',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit', hp: { current: 1, max: 10 } })],
      firstId: 'hero'
    })
    const result = resolveNonLethalVictory({
      encounterId: 'enc-no-auto',
      actorId: 'hero',
      targetId: 'bandit',
      store,
      lootSeed: 'no-auto.seed'
    })
    expect(result.encounter.combatants.find((c) => c.id === 'bandit')?.conditions).toEqual(['down'])
  })
})

describe('CombatEngine execute action', () => {
  it('requires a deliberate execute action for helpless or surrendered foes', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-execute',
      combatants: [
        hero({ id: 'hero' }),
        enemy({ id: 'bandit', hp: { current: 0, max: 10 }, conditions: ['surrendered'] })
      ],
      firstId: 'hero'
    })
    const executed = executeHelplessCombatant({
      encounterId: 'enc-execute',
      actorId: 'hero',
      targetId: 'bandit',
      store,
      lootSeed: 'execute.seed'
    })
    expect(executed.encounter.combatants.find((c) => c.id === 'bandit')?.conditions).toContain(
      'executed'
    )
    expect(executed.loot.length).toBeGreaterThan(0)
  })

  it('rejects execute unless the target is helpless, surrendered, or down', () => {
    const store = createMemoryEncounterStore()
    seedEncounter(store, {
      encounterId: 'enc-exec-reject',
      combatants: [hero({ id: 'hero' }), enemy({ id: 'bandit' })],
      firstId: 'hero'
    })
    expect(() =>
      executeHelplessCombatant({
        encounterId: 'enc-exec-reject',
        actorId: 'hero',
        targetId: 'bandit',
        store,
        lootSeed: 'reject.seed'
      })
    ).toThrow(/helpless|surrendered|down/i)
  })
})

function seedEncounter(
  store: EncounterStore,
  options: {
    encounterId: string
    combatants: readonly EncounterCombatantInput[]
    firstId: string
  }
): void {
  const encounter = startEncounter(
    { encounterId: options.encounterId, combatants: options.combatants, store },
    { roller: () => 10 }
  )
  const index = encounter.turnOrder.indexOf(options.firstId)
  if (index < 0) {
    throw new Error(`Missing combatant ${options.firstId}`)
  }
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: index,
    currentTurn: { combatantId: options.firstId, actionUsed: false, movementUsed: false },
    combatants: encounter.combatants.map((combatant) => mergeSeedCombatant(combatant, options.combatants))
  })
}

function mergeSeedCombatant(
  combatant: { id: string; conditions: readonly string[] },
  sources: readonly EncounterCombatantInput[]
) {
  const source = sources.find((entry) => entry.id === combatant.id)
  return {
    ...combatant,
    conditions: [...(source?.conditions ?? combatant.conditions)],
    ...(source?.hp === undefined ? {} : { hp: { ...source.hp } })
  }
}

function hero(
  overrides: Partial<EncounterCombatantInput> & { id: string }
): EncounterCombatantInput {
  return {
    kind: 'character',
    displayName: overrides.id,
    abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 },
    hp: { current: 20, max: 20 },
    conditions: [],
    ...overrides
  }
}

function enemy(
  overrides: Partial<EncounterCombatantInput> & { id: string }
): EncounterCombatantInput {
  return {
    kind: 'enemy',
    displayName: overrides.id,
    abilityScores: { Body: 10, Agility: 10, Mind: 8, Presence: 8 },
    hp: { current: 12, max: 12 },
    conditions: [],
    ...overrides
  }
}
