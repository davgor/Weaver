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
  submitCombatAction,
  type EncounterStore
} from '@weaver/combat-engine'
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
  return {
    completer: routingCompleter ?? rest.completer ?? routingCompleterForNarration(),
    currency: rest.currency ?? createCurrencyApi(),
    travel: rest.travel ?? {
      advanceTravelDays: (campaignId, proposedDays) => ({
        campaignId,
        advancedDays: proposedDays,
        day: proposedDays
      })
    },
    destinations: rest.destinations ?? { isGenerated: () => true },
    narration: narrationPeers(narration),
    combat: rest.combat ?? combatApi(store),
    persist: rest.persist ?? (() => undefined)
  }
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

function narrationPeers(completer: TextCompleter): ResolveTurnDeps['narration'] {
  return {
    llm: completer,
    npcs: { getNpc: () => undefined },
    items: { hasItem: () => true },
    locations: { isKnownLocation: () => true }
  }
}

function combatApi(store: EncounterStore): ResolveTurnDeps['combat'] {
  return {
    getEncounter: (encounterId) => getEncounter({ encounterId, store }),
    submitCombatAction: (input) => submitCombatAction({ ...input, store })
  }
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

function scores() {
  return { Body: 10, Agility: 12, Mind: 10, Presence: 10 }
}
