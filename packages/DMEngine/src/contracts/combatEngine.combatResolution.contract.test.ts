import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  getEncounter,
  startEncounter,
  type EncounterStore
} from '@weaver/combat-engine'
import {
  createActionLockoutStore,
  createKnownActionStore,
  createSeedCatalog,
  useAction
} from '@weaver/action-engine'
import { createItemService } from '@weaver/item-engine'
import { createStoreCombatTurnApi } from '../turnRouting/combatApi.js'
import { resolveCombatBranch } from '../turnRouting/branches/combat.js'

describe('DMEngine -> CombatEngine combat resolution contract', () => {
  it('resolves a structured attack through CombatEngine published resolveAttack API', () => {
    const store = createMemoryEncounterStore()
    seed(store)
    const items = createItemService()
    const sword = seedSword(items)
    const result = resolveCombatBranch({
      combat: createStoreCombatTurnApi(store, {
        attack: {
          roller: () => 18,
          getWeaponDamageProfile: (id) => items.getWeaponDamageProfile(id)
        }
      }),
      encounterId: 'enc-contract-attack',
      combatantId: 'hero',
      combatIntent: {
        kind: 'attack',
        targetId: 'goblin',
        weaponInstanceId: sword.id,
        attackAbility: 'Body',
        proficient: true,
        proficiencyBonus: 5
      }
    })

    expect(result.kind).toBe('combat')
    if (result.kind !== 'combat') return
    expect(result.outcome.type).toBe('attack')
    expect(getEncounter({ encounterId: 'enc-contract-attack', store })?.currentTurn.actionUsed).toBe(
      true
    )
  })

  it('resolves flee through CombatEngine published attemptFlee API', () => {
    const store = createMemoryEncounterStore()
    seed(store, 'enc-contract-flee')
    const result = resolveCombatBranch({
      combat: createStoreCombatTurnApi(store, { resolution: { roller: () => 20 } }),
      encounterId: 'enc-contract-flee',
      combatantId: 'hero',
      combatIntent: { kind: 'flee' }
    })
    expect(result).toMatchObject({ kind: 'combat', outcome: { type: 'flee' } })
  })
})

describe('DMEngine -> ActionEngine combat action contract', () => {
  it('applies ActionEngine useAction legality before marking the combat action', () => {
    const store = createMemoryEncounterStore()
    seed(store, 'enc-contract-action')
    const catalog = createSeedCatalog()
    const knownActions = createKnownActionStore(catalog)
    knownActions.grantKnownAction('hero', 'ice_bolt')
    const lockout = createActionLockoutStore()

    const result = resolveCombatBranch({
      combat: createStoreCombatTurnApi(store),
      encounterId: 'enc-contract-action',
      combatantId: 'hero',
      actions: {
        useAction: (input) => useAction(input, { catalog, knownActions, lockout })
      },
      combatIntent: {
        kind: 'action',
        actionId: 'ice_bolt',
        targetIds: ['goblin'],
        distanceFeet: 20
      }
    })

    expect(result).toMatchObject({
      kind: 'combat',
      outcome: { type: 'action', actionId: 'ice_bolt' }
    })
    expect(lockout.getRemainingActionTurns('hero')).toBeGreaterThan(0)
  })
})

function seed(store: EncounterStore, encounterId = 'enc-contract-attack'): void {
  const encounter = startEncounter(
    {
      encounterId,
      store,
      combatants: [
        {
          id: 'hero',
          kind: 'character',
          abilityScores: { Body: 16, Agility: 12, Mind: 10, Presence: 10 },
          hp: { current: 20, max: 20 }
        },
        {
          id: 'goblin',
          kind: 'enemy',
          abilityScores: { Body: 10, Agility: 10, Mind: 8, Presence: 8 },
          hp: { current: 12, max: 12 },
          armorClass: 10
        }
      ]
    },
    { roller: () => 18 }
  )
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: encounter.turnOrder.indexOf('hero'),
    currentTurn: { combatantId: 'hero', actionUsed: false, movementUsed: false }
  })
}

function seedSword(items: ReturnType<typeof createItemService>) {
  items.defineTemplate({
    id: 'template.dm-contract-sword',
    name: 'Contract Sword',
    equipmentSlots: ['mainHand'],
    tags: ['weapon'],
    weaponDamage: [{ damageType: 'Physical', amount: 6 }]
  })
  items.createInventory('hero')
  return items.addItem('hero', 'template.dm-contract-sword')
}
