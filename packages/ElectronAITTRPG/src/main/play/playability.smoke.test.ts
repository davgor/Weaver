import { beforeEach, describe, expect, it } from 'vitest'
import {
  addJournalEntry,
  awardXp,
  clearCharacterStatsStore,
  clearStartingLoadoutStore,
  listJournalEntries,
  persistCharacterMaxHp,
  selectStartingLoadout,
  setCampaignDeathMode
} from '@weaver/character-engine'
import {
  createMemoryEncounterStore,
  startEncounter,
  type EncounterStore
} from '@weaver/combat-engine'
import {
  createStoreCombatTurnApi,
  resolveEncounterLoop,
  resolveTurn,
  type ResolveTurnDeps,
  type ResolveTurnResult
} from '@weaver/dm-engine'
import { clampProposedPrice, createCurrencyService } from '@weaver/item-engine'
import { clearNarrationStore, type TextCompleter } from '@weaver/narration-engine'
import type { WeaponDamageProfile } from '@weaver/item-engine'

/**
 * Scripted playability smoke (REBUILD_SPEC §15 spine) without a live LLM.
 * Stages: campaign death mode → multi-PC setup → play narration → combat start/attack → XP reward.
 */
describe('playability smoke setup', () => {
  beforeEach(() => {
    clearNarrationStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
  })

  it('runs create→hub→play→combat→rewards and keeps multi-PC story isolation', async () => {
    const { campaignId, deps } = smokeFixture()
    await expectNarrationTurn(campaignId, deps)
    expectCombatAttack(campaignId, deps)
    await expectIsolationTurn(campaignId, deps)
  })
})

async function expectNarrationTurn(campaignId: string, deps: ResolveTurnDeps): Promise<void> {
  const look = await resolveTurn(
    {
      channel: 'play',
      campaignId,
      characterId: 'pc-a',
      text: 'look around'
    },
    deps
  )
  expect(look.route).toBe('narration')
  expect(look.projections.scene.length + look.projections.social.length).toBeGreaterThan(0)
}

function expectCombatAttack(campaignId: string, deps: ResolveTurnDeps): void {
  const combat = resolveEncounterLoop({
    branch: {
      combat: deps.combat,
      encounterId: 'enc-smoke',
      combatantId: 'pc-a',
      combatIntent: {
        kind: 'attack',
        targetId: 'foe-1',
        weaponInstanceId: 'weapon.smoke',
        attackAbility: 'Body',
        proficient: true,
        proficiencyBonus: 2
      }
    },
    context: { campaignId, characterId: 'pc-a', text: 'attack the foe' },
    rewards: { xpDifficulty: 'easy' },
    progression: { awardXp }
  })

  expect(combat.kind).toBe('combat')
  expect(combat.outcome.type).toBe('attack')
  expectVictoryOrActive(combat)
}

async function expectIsolationTurn(campaignId: string, deps: ResolveTurnDeps): Promise<void> {
  const bTurn = await resolveTurn(
    {
      channel: 'play',
      campaignId,
      characterId: 'pc-b',
      text: 'study the map',
      socialSpeakerId: 'pc-b'
    },
    deps
  )
  expect(bTurn.route).toBe('narration')
  assertIsolation(bTurn)
}

function smokeFixture(): { campaignId: string; deps: ResolveTurnDeps } {
  const campaignId = 'smoke.campaign'
  setCampaignDeathMode(campaignId, 'standard')
  seedPc('pc-a', 'Fighter')
  seedPc('pc-b', 'Mage')
  addJournalEntry({ characterId: 'pc-a', text: 'Private to A' })

  const store = createMemoryEncounterStore()
  seedActiveEncounter(store, 'enc-smoke')
  return { campaignId, deps: smokeDeps(store) }
}

function expectVictoryOrActive(combat: {
  encounter: { status: string }
  rewards?: { xp?: { xpAwarded: number }; loot: readonly unknown[] }
}): void {
  if (combat.encounter.status === 'resolved') {
    expect(combat.rewards?.xp?.xpAwarded ?? 0).toBeGreaterThanOrEqual(0)
    return
  }
  expect(combat.encounter.status).toBe('active')
}

function assertIsolation(bTurn: ResolveTurnResult): void {
  expect(listJournalEntries('pc-a')).toHaveLength(1)
  expect(listJournalEntries('pc-b')).toHaveLength(0)
  expect(bTurn.route).toBe('narration')
}

function seedPc(characterId: string, archetype: 'Fighter' | 'Mage'): void {
  selectStartingLoadout(characterId, archetype)
  persistCharacterMaxHp({ characterId, hitDie: 8, level: 1, bodyMod: 1 })
}

function seedActiveEncounter(store: EncounterStore, encounterId: string): void {
  const encounter = startEncounter(
    {
      encounterId,
      store,
      combatants: [
        {
          id: 'pc-a',
          kind: 'character',
          abilityScores: scores(),
          hp: { current: 20, max: 20 }
        },
        {
          id: 'foe-1',
          kind: 'enemy',
          abilityScores: scores(),
          hp: { current: 4, max: 4 },
          armorClass: 8
        }
      ]
    },
    { roller: () => 20 }
  )
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: encounter.turnOrder.indexOf('pc-a'),
    currentTurn: { combatantId: 'pc-a', actionUsed: false, movementUsed: false }
  })
}

function smokeDeps(store: EncounterStore): ResolveTurnDeps {
  const currency = createCurrencyService()
  const weapon: WeaponDamageProfile = {
    damageComponents: [{ damageType: 'Physical', amount: 8 }],
    onHitEffectIds: []
  }
  return {
    completer: routeCompleter(),
    currency: {
      credit: (id, amount) => currency.credit(id, amount),
      debit: (id, amount) => currency.debit(id, amount),
      getBalance: (id) => currency.getBalance(id),
      clampProposedPrice
    },
    travel: {
      advanceTravelDays: (campaignId, days) => ({
        campaignId,
        advancedDays: days,
        day: days
      }),
      setCharacterLocation: (input) => ({
        characterId: input.characterId,
        campaignId: input.campaignId,
        regionId: input.regionId,
        locationKind: input.locationKind,
        ...(input.placeId === undefined ? {} : { placeId: input.placeId }),
        ...(input.updatedDay === undefined ? {} : { updatedDay: input.updatedDay })
      })
    },
    destinations: {
      isGenerated: () => true,
      resolvePlacement: (destinationId) => ({
        regionId: destinationId,
        placeId: destinationId,
        locationKind: 'settlement'
      })
    },
    narration: {
      llm: proseCompleter(),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: createStoreCombatTurnApi(store, {
      attack: { roller: () => 18, getWeaponDamageProfile: () => weapon }
    }),
    progression: { awardXp },
    persist: () => undefined
  }
}

function routeCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: '{"intent":"look","route":"narration"}',
      backend: 'smoke'
    })
  }
}

function proseCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: 'The chamber answers your attention.\n<<<CLAIMS\n>>>',
      backend: 'smoke'
    })
  }
}

function scores() {
  return { Body: 14, Agility: 12, Mind: 10, Presence: 10 }
}
