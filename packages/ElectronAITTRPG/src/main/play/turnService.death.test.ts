import { describe, expect, it } from 'vitest'
import type {
  CharacterAutosaveSnapshot,
  CharacterDeathResolution,
  CharacterProgression,
  CharacterStats,
  ResolveCharacterDeathInput
} from '@weaver/character-engine'
import type { EncounterCombatant, EncounterState } from '@weaver/combat-engine'
import type { ResolveTurnInput, ResolveTurnResult } from '@weaver/dm-engine'
import { createTurnService } from './turnService.js'

describe('turnService autosave on success', () => {
  it('records an autosave snapshot after a successful non-death turn', async () => {
    const recorded: Array<{ characterId: string; snapshot: CharacterAutosaveSnapshot }> = []
    const service = createTurnService({
      resolveTurn: async () => turnResult(),
      deps: {},
      character: {
        getCharacterStats: () => aliveStats(),
        getCharacterProgression: () => progression(),
        recordAutosaveSnapshot: (characterId, snapshot) => {
          recorded.push({ characterId, snapshot })
          return snapshot
        },
        resolveCharacterDeath: async () => {
          throw new Error('death should not resolve')
        }
      },
      now: () => '2026-07-26T15:00:00.000Z'
    })

    const result = await service.submitAction({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      text: 'look around'
    })

    expect(result).toMatchObject({ ok: true, death: null })
    expect(recorded).toEqual([
      {
        characterId: 'pc-1',
        snapshot: {
          stats: aliveStats(),
          progression: progression(),
          recordedAt: '2026-07-26T15:00:00.000Z'
        }
      }
    ])
  })
})

describe('turnService combat death', () => {
  it('resolves campaign death mode when combat leaves the player character at 0 HP', async () => {
    const requests: ResolveCharacterDeathInput[] = []
    const service = createTurnService({
      resolveTurn: async (input: ResolveTurnInput) =>
        turnResult({
          route: 'combat',
          resolution: {
            kind: 'combat',
            encounter: encounterWithPcHp(input.characterId, 0),
            outcome: {
              type: 'attack',
              hit: true,
              totalDamage: 12,
              critical: false,
              targetId: input.characterId,
              targetHp: { current: 0, max: 10 },
              conditions: []
            }
          }
        }),
      deps: {},
      character: deathCharacterPort(requests)
    })

    const result = await service.submitAction({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      encounterId: 'enc-1',
      text: 'attack'
    })

    expect(requests).toMatchObject([
      {
        campaignId: 'camp-1',
        characterId: 'pc-1',
        cause: 'Hit points reached 0'
      }
    ])
    expect(result).toMatchObject({
      ok: true,
      death: {
        mode: 'legendary',
        status: 'dead',
        obituary: 'Ilyra fell beneath the ash moon.'
      }
    })
  })
})

describe('turnService death mode outcomes', () => {
  it('surfaces Standard restore and Respawn death outcomes distinctly', async () => {
    await expect(submitDeathTurn(standardResolution())).resolves.toMatchObject({
      ok: true,
      death: { mode: 'standard', status: 'alive', restoredFromAutosave: true }
    })
    await expect(submitDeathTurn(respawnResolution())).resolves.toMatchObject({
      ok: true,
      death: {
        mode: 'respawn',
        status: 'alive',
        respawn: { relocatedTo: 'The Lantern Shrine', costPaid: 5 }
      }
    })
  })
})

function deathCharacterPort(requests: ResolveCharacterDeathInput[]) {
  return {
    getCharacterStats: () => aliveStats(),
    getCharacterProgression: () => progression(),
    recordAutosaveSnapshot: () => {
      throw new Error('death turns must not overwrite autosave')
    },
    resolveCharacterDeath: async (input: ResolveCharacterDeathInput) => {
      requests.push(input)
      return {
        mode: 'legendary' as const,
        status: 'dead' as const,
        cause: input.cause,
        obituary: 'Ilyra fell beneath the ash moon.'
      }
    }
  }
}

async function submitDeathTurn(resolution: CharacterDeathResolution) {
  const service = createTurnService({
    resolveTurn: async () => turnResult(),
    deps: {},
    character: {
      getCharacterStats: () => dyingStats(),
      getCharacterProgression: () => progression(),
      recordAutosaveSnapshot: () => {
        throw new Error('death turns must not autosave')
      },
      resolveCharacterDeath: async () => resolution
    }
  })
  return service.submitAction({ campaignId: 'camp-1', characterId: 'pc-1', text: 'make a dying save' })
}

function turnResult(overrides: Partial<ResolveTurnResult> = {}): ResolveTurnResult {
  return {
    route: 'narration',
    skipLlm: false,
    resolution: { kind: 'narration', text: 'look around' },
    narration: { kind: 'scene', status: 'persisted', prose: 'The room brightens.' },
    projections: {
      scene: [{ id: 'scene-1', text: 'The room brightens.', at: 1 }],
      social: []
    },
    ...overrides
  }
}

function aliveStats(): CharacterStats {
  return {
    characterId: 'pc-1',
    maxHp: 10,
    currentHp: 7,
    conditions: [],
    dying: null
  }
}

function dyingStats(): CharacterStats {
  return {
    characterId: 'pc-1',
    maxHp: 10,
    currentHp: 0,
    conditions: ['Unconscious'],
    dying: { successes: 0, failures: 3, stable: false }
  }
}

function progression(): CharacterProgression {
  return { characterId: 'pc-1', level: 2, xp: 40 }
}

function standardResolution(): CharacterDeathResolution {
  return {
    mode: 'standard',
    status: 'alive',
    restoredFromAutosave: true
  }
}

function respawnResolution(): CharacterDeathResolution {
  return {
    mode: 'respawn',
    status: 'alive',
    respawn: {
      relocatedTo: 'The Lantern Shrine',
      costPaid: 5,
      respawnsUsed: 1,
      respawnsRemaining: 2,
      goldRemaining: 15
    }
  }
}

function encounterWithPcHp(characterId: string, currentHp: number): EncounterState {
  return {
    encounterId: 'enc-1',
    status: 'active',
    startMode: 'pre-authored',
    round: 1,
    currentTurnIndex: 0,
    currentTurn: { combatantId: characterId, actionUsed: true, movementUsed: false },
    turnOrder: [characterId],
    turnLog: [],
    combatants: [combatant(characterId, currentHp)]
  }
}

function combatant(characterId: string, currentHp: number): EncounterCombatant {
  return {
    id: characterId,
    kind: 'character',
    displayName: 'Ilyra',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    hp: { current: currentHp, max: 10 },
    armorClass: 12,
    conditions: currentHp === 0 ? ['down'] : [],
    characterConditions: currentHp === 0 ? ['Unconscious'] : [],
    damageResistances: [],
    damageVulnerabilities: [],
    initiative: { roll: 10, modifier: 0, total: 10 }
  }
}
