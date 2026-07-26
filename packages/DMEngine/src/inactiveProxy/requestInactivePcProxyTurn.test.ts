import { beforeEach, describe, expect, it } from 'vitest'
import {
  addJournalEntry,
  clearCharacterStatsStore,
  clearStartingLoadoutStore,
  listJournalEntries,
  listQuestLog,
  persistCharacterMaxHp,
  requestInactiveProxyAction,
  selectStartingLoadout,
  upsertQuest,
  type InactiveProxyActionSuggestion
} from '@weaver/character-engine'
import { createStoreCombatTurnApi } from '../turnRouting/combatApi.js'
import { resolveTurn } from '../turnRouting/resolveTurn.js'
import {
  createMemoryEncounterStore,
  getEncounter,
  startEncounter
} from '@weaver/combat-engine'
import { clearNarrationStore, type TextCompleter } from '@weaver/narration-engine'
import { createCurrencyService, clampProposedPrice } from '@weaver/item-engine'
import { requestInactivePcProxyTurn } from './requestInactivePcProxyTurn.js'
import type { RequestInactivePcProxyTurnDeps, ResolveTurnFn } from './types.js'
import type { ItemCurrencyApi, ResolveTurnDeps, TurnPersistRecord } from '../turnRouting/types.js'

beforeEach(() => {
  clearNarrationStore()
  clearStartingLoadoutStore()
  clearCharacterStatsStore()
})

describe('requestInactivePcProxyTurn validation', () => {
  it('rejects when the target character is the active player character', async () => {
    await expect(
      requestInactivePcProxyTurn(
        {
          campaignId: 'camp-proxy',
          characterId: 'pc-active',
          activeCharacterId: 'pc-active',
          intentTag: 'melee'
        },
        stubDeps()
      )
    ).rejects.toMatchObject({ code: 'DM_INACTIVE_PROXY_TARGET_ACTIVE' })
  })

  it('rejects empty campaign, character, or intent fields', async () => {
    await expect(
      requestInactivePcProxyTurn(
        {
          campaignId: ' ',
          characterId: 'pc-b',
          activeCharacterId: 'pc-a',
          intentTag: 'melee'
        },
        stubDeps()
      )
    ).rejects.toMatchObject({ code: 'DM_INACTIVE_PROXY_INPUT_INVALID' })
  })
})

describe('requestInactivePcProxyTurn happy path', () => {
  it('requests a grounded suggestion and resolves a narration turn for the inactive PC', async () => {
    seedInactivePc('pc-inactive', 'Ranger')
    const persisted: TurnPersistRecord[] = []
    const deps = liveDeps({
      persist: (record) => {
        persisted.push(record)
      }
    })

    const result = await requestInactivePcProxyTurn(
      {
        campaignId: 'camp-proxy',
        characterId: 'pc-inactive',
        activeCharacterId: 'pc-active',
        intentTag: 'hamstring'
      },
      deps
    )

    expect(result.suggestion).toMatchObject({
      characterId: 'pc-inactive',
      intentTag: 'hamstring',
      groundedIn: 'known_action',
      actionId: 'hamstring_strike'
    })
    expect(result.turn.route).toBe('narration')
    expect(persisted).toHaveLength(1)
    expect(persisted[0]).toMatchObject({
      campaignId: 'camp-proxy',
      characterId: 'pc-inactive',
      route: 'narration'
    })
  })
})

describe('requestInactivePcProxyTurn isolation', () => {
  it('does not leak journal, quest, or combat state from the active PC', async () => {
    seedInactivePc('pc-b', 'Ranger')
    seedActivePcState()

    const encounterCalls: string[] = []
    const persisted: TurnPersistRecord[] = []
    const deps = isolationDeps(encounterCalls, persisted)

    await requestInactivePcProxyTurn(
      {
        campaignId: 'camp-isolation',
        characterId: 'pc-b',
        activeCharacterId: 'pc-a',
        intentTag: 'hamstring'
      },
      deps
    )

    expectActivePcStateUnchanged(encounterCalls, persisted)
  })
})

function seedActivePcState(): void {
  addJournalEntry({ characterId: 'pc-a', text: 'Active journal entry' })
  upsertQuest({
    characterId: 'pc-a',
    questId: 'quest-a',
    kind: 'main',
    status: 'active',
    title: 'Active quest'
  })

  const store = createMemoryEncounterStore()
  startEncounter(
    {
      encounterId: 'enc-a',
      store,
      combatants: [
        { id: 'pc-a', kind: 'character', abilityScores: scores() },
        { id: 'enemy-a', kind: 'enemy', abilityScores: scores() }
      ]
    },
    { roller: () => 10 }
  )
}

function isolationDeps(
  encounterCalls: string[],
  persisted: TurnPersistRecord[]
): RequestInactivePcProxyTurnDeps {
  const store = createMemoryEncounterStore()
  const baseCombat = createStoreCombatTurnApi(store)
  return liveDeps({
    combat: {
      ...baseCombat,
      getEncounter: (encounterId) => {
        encounterCalls.push(encounterId)
        return getEncounter({ encounterId, store })
      }
    },
    persist: (record) => {
      persisted.push(record)
    }
  })
}

function expectActivePcStateUnchanged(
  encounterCalls: string[],
  persisted: TurnPersistRecord[]
): void {
  expect(listJournalEntries('pc-a')).toHaveLength(1)
  expect(listJournalEntries('pc-a')[0]?.text).toBe('Active journal entry')
  expect(listQuestLog('pc-a')).toEqual([
    {
      questId: 'quest-a',
      kind: 'main',
      status: 'active',
      title: 'Active quest'
    }
  ])
  expect(encounterCalls).toEqual([])
  expect(persisted.every((record) => record.characterId === 'pc-b')).toBe(true)
}

function seedInactivePc(characterId: string, archetype: 'Ranger'): void {
  selectStartingLoadout(characterId, archetype)
  persistCharacterMaxHp({ characterId, hitDie: 10, level: 1, bodyMod: 2 })
}

function stubDeps(): RequestInactivePcProxyTurnDeps {
  const suggestion: InactiveProxyActionSuggestion = {
    characterId: 'pc-b',
    intentTag: 'melee',
    actionId: 'strike',
    groundedIn: 'known_action',
    stats: {
      characterId: 'pc-b',
      maxHp: 12,
      currentHp: 12,
      conditions: [],
      dying: null
    }
  }
  return {
    characters: {
      requestInactiveProxyAction: () => suggestion
    },
    resolveTurn: neverResolveTurn,
    turnDeps: minimalTurnDeps()
  }
}

const neverResolveTurn: ResolveTurnFn = async () => {
  throw new Error('resolveTurn should not run for validation failures')
}

function liveDeps(overrides: Partial<ResolveTurnDeps> = {}): RequestInactivePcProxyTurnDeps {
  const turnDeps = minimalTurnDeps(overrides)
  return {
    characters: { requestInactiveProxyAction },
    resolveTurn,
    turnDeps
  }
}

function minimalTurnDeps(overrides: Partial<ResolveTurnDeps> = {}): ResolveTurnDeps {
  const store = createMemoryEncounterStore()
  return {
    completer: narrationRouteCompleter(),
    currency: createCurrencyApi(),
    travel: {
      advanceTravelDays: (campaignId, proposedDays) => ({
        campaignId,
        advancedDays: proposedDays,
        day: proposedDays
      })
    },
    destinations: { isGenerated: () => true },
    narration: {
      llm: sceneCompleter('The companion acts.'),
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: createStoreCombatTurnApi(store),
    persist: () => undefined,
    ...overrides
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

function narrationRouteCompleter(): TextCompleter {
  return {
    completeText: async () => ({
      text: '{"intent":"hamstring","route":"narration"}',
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

function scores() {
  return { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
}
