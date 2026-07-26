import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { getAbilityModifier, setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { generateEncounterFoes, hydrateCombatantFromFoe } from '@weaver/enemy-engine'
import {
  clearNpcStore,
  constructNpc,
  hydrateNpcCombatTier
} from '@weaver/npc-engine'
import {
  createJsonEncounterStore,
  hydrateCombatantFromFoeRef,
  hydrateCombatantFromNpcId,
  startEncounter
} from './index.js'

beforeEach(() => {
  clearNpcStore()
  clearNpcPlaceholderStore()
})

describe('CombatEngine CharacterEngine contract', () => {
  it('uses ability modifiers for initiative totals', () => {
    withPeerContractTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })

      const encounter = startEncounter(
        {
          encounterId: 'enc-character-contract',
          combatants: [
            {
              id: 'hero-agile',
              kind: 'character',
              abilityScores: { Body: 10, Agility: 14, Mind: 10, Presence: 10 }
            }
          ],
          store
        },
        { roller: () => 11 }
      )

      expect(encounter.combatants[0]?.initiative.modifier).toBe(getAbilityModifier(14))
      expect(encounter.combatants[0]?.initiative.total).toBe(13)
    })
  })
})

describe('CombatEngine NPCEngine contract', () => {
  it('hydrates combat-tier records into encounter combatants', async () => {
    await withPeerContractTempDirAsync(async (dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      const combatant = await buildNpcContractCombatant()
      const encounter = startEncounter(
        { encounterId: 'enc-npc-contract', combatants: [combatant], store },
        { roller: () => 9 }
      )

      expect(combatant).toMatchObject({
        id: 'npc-guard-contract',
        kind: 'npc',
        hp: { current: 12, max: 12 },
        armorClass: 13
      })
      expect(encounter.combatants[0]?.initiative.total).toBe(12)
    })
  })
})

describe('CombatEngine EnemyEngine contract', () => {
  it('hydrates foe refs through the published foe hydration API', async () => {
    await withPeerContractTempDirAsync(async (dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      const [foe] = generateEncounterFoes({ difficulty: 'easy', tags: ['goblin'] })
      expect(foe).toBeDefined()
      if (foe === undefined) {
        return
      }

      const enemySnapshot = hydrateCombatantFromFoe(foe)
      const combatant = await hydrateCombatantFromFoeRef(foe)
      const encounter = startEncounter(
        { encounterId: 'enc-enemy-contract', combatants: [combatant], store },
        { roller: () => 7 }
      )

      expect(combatant).toMatchObject({
        id: enemySnapshot.id,
        kind: 'enemy',
        displayName: enemySnapshot.name,
        hp: { current: enemySnapshot.hp.current, max: enemySnapshot.hp.max }
      })
      expect(encounter.combatants[0]?.initiative.total).toBe(9)
    })
  })
})

function withPeerContractTempDir(run: (dataRoot: string) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-combat-'))
  try {
    run(dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

async function withPeerContractTempDirAsync(run: (dataRoot: string) => Promise<void>): Promise<void> {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-combat-'))
  try {
    await run(dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

async function buildNpcContractCombatant() {
  setCampaignRaceRoster('campaign-npc-contract', [{ raceId: 'human', name: 'Human' }])
  const [slot] = ensureNpcPlaceholders({
    worldId: 'world-npc-contract',
    civilizationId: 'civ-npc-contract',
    regionId: 'region-npc-contract',
    roleHints: ['guard']
  })
  expect(slot).toBeDefined()
  if (slot === undefined) {
    throw new Error('Expected NPC placeholder slot')
  }
  constructNpc({
    campaignId: 'campaign-npc-contract',
    worldId: 'world-npc-contract',
    npcId: 'npc-guard-contract',
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'alert',
    abilityScores: { Body: 12, Agility: 16, Mind: 10, Presence: 10 }
  })
  hydrateNpcCombatTier({
    npcId: 'npc-guard-contract',
    tierId: 'guard',
    level: 2,
    hitDie: 8,
    rolls: [6, 5],
    armorClass: 13
  })

  return hydrateCombatantFromNpcId('npc-guard-contract')
}
