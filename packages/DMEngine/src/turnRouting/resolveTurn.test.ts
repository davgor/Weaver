import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampProposedPrice,
  createCurrencyService
} from '@weaver/item-engine'
import {
  clearNarrationStore,
  projectScene,
  type TextCompleter
} from '@weaver/narration-engine'
import {
  createMemoryEncounterStore,
  getEncounter,
  startEncounter,
  type EncounterStore
} from '@weaver/combat-engine'
import { createStoreCombatTurnApi } from './combatApi.js'
import type { ItemCurrencyApi } from '../intents/types.js'
import { resolveTurn } from './resolveTurn.js'
import type { ResolveTurnDeps, TurnPersistRecord } from './types.js'

beforeEach(() => {
  clearNarrationStore()
})

describe('resolveTurn askDm rejection', () => {
  it('throws before routing when channel is askDm', async () => {
    await expect(
      resolveTurn(
        {
          channel: 'askDm',
          campaignId: 'camp-1',
          characterId: 'pc-1',
          text: 'How does grappling work?'
        },
        baseDeps()
      )
    ).rejects.toMatchObject({ code: 'DM_TURN_ASK_DM_REJECTED' })
  })
})

describe('resolveTurn commerce routing', () => {
  it('routes buy intents through ItemEngine currency without LLM routing', async () => {
    const persisted: TurnPersistRecord[] = []
    const currency = createCurrencyApi()
    currency.credit('pc-buy', 100)
    const routingCompleter = neverCalledCompleter()
    const narrationCompleter = sceneCompleter('The merchant nods.')

    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-commerce',
        characterId: 'pc-buy',
        text: 'I buy the iron sword',
        itemId: 'item.iron-sword',
        proposedPrice: 12
      },
      baseDeps({
        currency,
        routingCompleter,
        narrationCompleter,
        persist: (record) => {
          persisted.push(record)
        }
      })
    )

    expect(result.route).toBe('commerce')
    expect(result.skipLlm).toBe(true)
    expect(result.resolution).toMatchObject({
      kind: 'buy',
      itemId: 'item.iron-sword',
      price: clampProposedPrice(12)
    })
    expect(currency.getBalance('pc-buy')).toBe(100 - clampProposedPrice(12))
    expect(result.narration.status).toBe('persisted')
    expect(projectScene().length).toBeGreaterThan(0)
    expect(persisted).toHaveLength(1)
    expect(routingCompleter.calls).toBe(0)
  })
})

describe('resolveTurn travel routing', () => {
  it('routes travel intents through CharacterEngine travel without narration preemption', async () => {
    const routingCompleter = neverCalledCompleter()
    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-travel',
        characterId: 'pc-travel',
        text: 'travel to Riverford',
        destinationId: 'loc.riverford',
        proposedDays: 2
      },
      baseDeps({
        routingCompleter,
        narrationCompleter: sceneCompleter('Dust rises on the road.')
      })
    )

    expect(result.route).toBe('travel')
    expect(result.skipLlm).toBe(true)
    expect(result.resolution).toMatchObject({
      kind: 'travel',
      destinationId: 'loc.riverford',
      advance: { campaignId: 'camp-travel', advancedDays: 2, day: 2 }
    })
    expect(routingCompleter.calls).toBe(0)
  })
})

describe('resolveTurn combat exclusivity', () => {
  it('routes active combat turns exclusively through CombatEngine', async () => {
    const store = createMemoryEncounterStore()
    const heroId = seedActiveEncounter(store)
    const persisted: TurnPersistRecord[] = []
    const currency = createCurrencyApi()
    currency.credit(heroId, 500)

    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-combat',
        characterId: heroId,
        text: 'buy the sword',
        encounterId: 'enc-active',
        combatAction: 'Swing at the goblin',
        itemId: 'item.sword',
        proposedPrice: 5
      },
      baseDeps({
        currency,
        combat: combatApi(store),
        persist: (record) => {
          persisted.push(record)
        }
      })
    )

    expect(result.route).toBe('combat')
    expect(result.resolution).toMatchObject({ kind: 'combat' })
    expect(currency.getBalance(heroId)).toBe(500)
    expect(getEncounter({ encounterId: 'enc-active', store })?.currentTurn.actionUsed).toBe(true)
    expect(persisted[0]?.route).toBe('combat')
  })
})

describe('resolveTurn ad-hoc encounter start', () => {
  it('starts an ad-hoc encounter for combat-routed play with no encounter id', async () => {
    const store = createMemoryEncounterStore()
    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-start',
        characterId: 'hero-start',
        text: 'attack the goblin',
        combatAction: 'Draw steel',
        encounterStart: {
          mode: 'adHoc',
          knownCombatants: [
            { id: 'hero-start', kind: 'character', abilityScores: scores() },
            { id: 'goblin-start', kind: 'enemy', abilityScores: scores() }
          ],
          foeGeneration: { difficulty: 'easy', count: 1 }
        }
      },
      baseDeps({
        combat: createStoreCombatTurnApi(store, {
          start: { roller: () => 12 },
          adHoc: { roller: () => 12, generateEncounterFoes: () => [] }
        }),
        createEncounterId: () => 'enc-started',
        routingCompleter: combatRouteCompleter()
      })
    )

    expect(result.route).toBe('combat')
    expect(result.resolution).toMatchObject({
      kind: 'combat',
      encounter: { encounterId: 'enc-started', startMode: 'ad-hoc' }
    })
    expect(getEncounter({ encounterId: 'enc-started', store })?.status).toBe('active')
  })
})

describe('resolveTurn combat rewards', () => {
  it('surfaces victory XP, loot, and level-up rewards on the turn result', async () => {
    const store = createMemoryEncounterStore()
    seedExecutableEncounter(store)
    const result = await resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-rewards',
        characterId: 'hero-rewards',
        text: 'execute the helpless goblin',
        encounterId: 'enc-rewards',
        encounterRewards: { xpDifficulty: 'impossible' },
        combatIntent: { kind: 'execute', targetId: 'goblin-rewards', lootSeed: 'reward-seed' }
      },
      baseDeps({
        combat: createStoreCombatTurnApi(store, {
          resolution: {
            generateLoot: () => [{ templateId: 'template.healing_potion', quantity: 1 }]
          }
        }),
        progression: {
          awardXp: (characterId) => ({
            characterId,
            level: 2,
            xp: 0,
            xpAwarded: 100,
            levelsGained: 1
          })
        }
      })
    )

    expect(result.resolution).toMatchObject({
      kind: 'combat',
      encounter: { status: 'resolved' },
      rewards: {
        loot: [{ templateId: 'template.healing_potion', quantity: 1 }],
        levelUp: { fromLevel: 1, toLevel: 2, xpAwarded: 100 }
      }
    })
  })
})

describe('resolveTurn turn lock', () => {
  it('rejects concurrent turns for the same campaign and character', async () => {
    let releasePersist: (() => void) | undefined
    const persistGate = new Promise<void>((resolve) => {
      releasePersist = resolve
    })
    const deps = baseDeps({
      routingCompleter: routingCompleterForNarration(),
      narrationCompleter: sceneCompleter('You study the room.'),
      persist: async () => {
        await persistGate
      }
    })
    const first = resolveTurn(
      {
        channel: 'play',
        campaignId: 'camp-lock',
        characterId: 'pc-lock',
        text: 'look around'
      },
      deps
    )
    await Promise.resolve()
    await expect(
      resolveTurn(
        {
          channel: 'play',
          campaignId: 'camp-lock',
          characterId: 'pc-lock',
          text: 'look again'
        },
        deps
      )
    ).rejects.toMatchObject({ code: 'DM_TURN_LOCK_CONFLICT' })
    releasePersist?.()
    await first
  })
})

type DepOverrides = Partial<ResolveTurnDeps> & {
  routingCompleter?: TextCompleter
  narrationCompleter?: TextCompleter
}

function baseDeps(overrides: DepOverrides = {}): ResolveTurnDeps {
  const { routingCompleter, narrationCompleter, ...rest } = overrides
  const store = createMemoryEncounterStore()
  const narration = narrationCompleter ?? sceneCompleter('The merchant nods.')
  const deps = defaultResolveTurnDeps(store, narration, routingCompleter, rest)
  applyOptionalDepOverrides(deps, rest)
  return deps
}

function defaultResolveTurnDeps(
  store: EncounterStore,
  narration: TextCompleter,
  routingCompleter: TextCompleter | undefined,
  rest: Omit<DepOverrides, 'routingCompleter' | 'narrationCompleter'>
): ResolveTurnDeps {
  return {
    completer: routingCompleter ?? rest.completer ?? routingCompleterForNarration(),
    currency: rest.currency ?? createCurrencyApi(),
    travel: rest.travel ?? {
      advanceTravelDays: (campaignId, proposedDays) => ({
        campaignId,
        advancedDays: proposedDays,
        day: proposedDays
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
    destinations: rest.destinations ?? {
      isGenerated: () => true,
      resolvePlacement: () => ({
        regionId: 'opaque-region-turn',
        placeId: 'opaque-place-turn',
        locationKind: 'settlement'
      })
    },
    narration: narrationPeers(narration),
    combat: rest.combat ?? combatApi(store),
    persist: rest.persist ?? (() => undefined)
  }
}

function applyOptionalDepOverrides(
  deps: ResolveTurnDeps,
  rest: Omit<DepOverrides, 'routingCompleter' | 'narrationCompleter'>
): void {
  if (rest.actions !== undefined) deps.actions = rest.actions
  if (rest.progression !== undefined) deps.progression = rest.progression
  if (rest.createEncounterId !== undefined) deps.createEncounterId = rest.createEncounterId
}

function createCurrencyApi(): ItemCurrencyApi {
  const service = createCurrencyService()
  return {
    credit: (characterId, amount) => service.credit(characterId, amount),
    debit: (characterId, amount) => service.debit(characterId, amount),
    getBalance: (characterId) => service.getBalance(characterId),
    clampProposedPrice
  }
}

function routingCompleterForNarration(): TextCompleter {
  return {
    completeText: async () => ({
      text: '{"intent":"look around","route":"narration"}',
      backend: 'scripted'
    })
  }
}

function sceneCompleter(prose: string): TextCompleter {
  return {
    completeText: async () => ({
      text: `${prose}\n<<<CLAIMS\n>>>`.trim(),
      backend: 'scripted'
    })
  }
}

function neverCalledCompleter(): TextCompleter & { calls: number } {
  let calls = 0
  return {
    get calls() {
      return calls
    },
    completeText: async () => {
      calls += 1
      throw new Error('LLM routing should not run for heuristic commerce turns')
    }
  }
}

function combatRouteCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: '{"intent":"attack goblin","route":"combat"}',
      backend: 'scripted'
    })
  }
}

function narrationPeers(completer: TextCompleter): ResolveTurnDeps['narration'] {
  return {
    llm: completer,
    npcs: { getNpc: () => undefined },
    items: { hasItem: () => true },
    locations: { isKnownLocation: () => true }
  }
}

function combatApi(store: EncounterStore): ResolveTurnDeps['combat'] {
  return createStoreCombatTurnApi(store)
}

function seedActiveEncounter(store: EncounterStore): string {
  const heroId = 'hero-combat'
  startEncounter(
    {
      encounterId: 'enc-active',
      combatants: [
        { id: heroId, kind: 'character', abilityScores: scores() },
        { id: 'goblin-1', kind: 'enemy', abilityScores: scores() }
      ],
      store
    },
    { roller: () => 15 }
  )
  return heroId
}

function seedExecutableEncounter(store: EncounterStore): void {
  const encounter = startEncounter(
    {
      encounterId: 'enc-rewards',
      combatants: [
        { id: 'hero-rewards', kind: 'character', abilityScores: scores() },
        {
          id: 'goblin-rewards',
          kind: 'enemy',
          abilityScores: scores(),
          conditions: ['helpless']
        }
      ],
      store
    },
    { roller: () => 15 }
  )
  store.saveEncounter({
    ...encounter,
    currentTurnIndex: encounter.turnOrder.indexOf('hero-rewards'),
    currentTurn: { combatantId: 'hero-rewards', actionUsed: false, movementUsed: false }
  })
}

function scores() {
  return { Body: 10, Agility: 12, Mind: 10, Presence: 10 }
}
