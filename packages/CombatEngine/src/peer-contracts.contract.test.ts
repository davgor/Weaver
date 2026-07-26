import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { getAbilityModifier, setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { generateEncounterFoes, hydrateCombatantFromFoe } from '@weaver/enemy-engine'
import { generateLoot } from '@weaver/item-engine'
import {
  clearNpcStore,
  constructNpc,
  getNpc,
  hydrateNpcCombatTier
} from '@weaver/npc-engine'
import {
  applySurrender,
  attemptFlee,
  createJsonEncounterStore,
  executeHelplessCombatant,
  hydrateCombatantFromFoeRef,
  hydrateCombatantFromNpcId,
  resolveNonLethalVictory,
  startAdHocEncounter,
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

  it('starts ad-hoc encounters through generateEncounterFoes', () => {
    withPeerContractTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      const foeRequest = { difficulty: 'easy' as const, tags: ['goblin'], count: 1 }
      const encounter = startAdHocEncounter(
        {
          encounterId: 'enc-adhoc-enemy-contract',
          knownCombatants: [],
          foeGeneration: foeRequest,
          store
        },
        { roller: () => 6 }
      )
      const [foe] = generateEncounterFoes(foeRequest)

      expect(encounter.startMode).toBe('ad-hoc')
      expect(foe).toBeDefined()
      expect(encounter.combatants[0]?.id).toBe(foe?.foeId)
      expect(encounter.combatants[0]?.kind).toBe('enemy')
    })
  })
})

describe('CombatEngine NPCEngine flee disposition contract', () => {
  it('writes flee outcomes through setNpcDefeatDisposition', async () => {
    await withPeerContractTempDirAsync(assertFleeDispositionWrite)
  })
})

describe('CombatEngine NPCEngine surrender disposition contract', () => {
  it('writes surrender outcomes through setNpcDefeatDisposition', async () => {
    await withPeerContractTempDirAsync(assertSurrenderDispositionWrite)
  })
})

describe('CombatEngine NPCEngine non-lethal disposition contract', () => {
  it('writes non-lethal outcomes through setNpcDefeatDisposition', async () => {
    await withPeerContractTempDirAsync(assertNonLethalDispositionWrite)
  })
})

describe('CombatEngine NPCEngine execute disposition contract', () => {
  it('writes execute outcomes through setNpcDefeatDisposition', async () => {
    await withPeerContractTempDirAsync(assertExecuteDispositionWrite)
  })
})

describe('CombatEngine ItemEngine loot-generation contract', () => {
  it('generates loot through ItemEngine generateLoot for non-lethal outcomes', () => {
    withPeerContractTempDir(assertLootGenerationContract)
  })
})

async function assertFleeDispositionWrite(dataRoot: string): Promise<void> {
  const store = createJsonEncounterStore({ dataRoot })
  const npc = await buildNpcContractCombatant(dispositionIds('flee'))
  const started = startEncounter(
    { encounterId: 'enc-disposition-flee', combatants: [heroCombatant('hero'), npc], store },
    { roller: () => 10 }
  )
  forceCurrentTurn(store, started, 'npc-flee-contract')
  attemptFlee(
    { encounterId: 'enc-disposition-flee', combatantId: 'npc-flee-contract', store },
    { roller: () => 18 }
  )
  expect(getNpc('npc-flee-contract')?.defeatDisposition).toMatchObject({
    disposition: 'fled',
    dead: false,
    source: { encounterId: 'enc-disposition-flee', actorId: 'npc-flee-contract' }
  })
}

async function assertSurrenderDispositionWrite(dataRoot: string): Promise<void> {
  const store = createJsonEncounterStore({ dataRoot })
  const npc = await buildNpcContractCombatant(dispositionIds('yield'))
  npc.hp = { current: 2, max: 20 }
  startEncounter(
    {
      encounterId: 'enc-disposition-yield',
      combatants: [heroCombatant('hero-a'), heroCombatant('hero-b'), npc],
      store
    },
    { roller: () => 10 }
  )
  applySurrender({
    encounterId: 'enc-disposition-yield',
    combatantId: 'npc-yield-contract',
    actorId: 'hero-a',
    store
  })
  expect(getNpc('npc-yield-contract')?.defeatDisposition).toMatchObject({
    disposition: 'yielded',
    dead: false,
    source: { encounterId: 'enc-disposition-yield', actorId: 'hero-a' }
  })
}

async function assertNonLethalDispositionWrite(dataRoot: string): Promise<void> {
  const store = createJsonEncounterStore({ dataRoot })
  const npc = await buildNpcContractCombatant(dispositionIds('down'))
  startEncounter(
    { encounterId: 'enc-disposition-down', combatants: [heroCombatant('hero'), npc], store },
    { roller: () => 10 }
  )
  resolveNonLethalVictory({
    encounterId: 'enc-disposition-down',
    actorId: 'hero',
    targetId: 'npc-down-contract',
    store,
    lootSeed: 'disposition.nonlethal'
  })
  expect(getNpc('npc-down-contract')?.defeatDisposition).toMatchObject({
    disposition: 'nonLethal',
    source: { encounterId: 'enc-disposition-down', actorId: 'hero' }
  })
}

async function assertExecuteDispositionWrite(dataRoot: string): Promise<void> {
  const store = createJsonEncounterStore({ dataRoot })
  const doomed = await buildNpcContractCombatant(dispositionIds('exec'))
  doomed.conditions = ['surrendered']
  doomed.hp = { current: 0, max: 12 }
  startEncounter(
    { encounterId: 'enc-disposition-exec', combatants: [heroCombatant('hero'), doomed], store },
    { roller: () => 10 }
  )
  executeHelplessCombatant({
    encounterId: 'enc-disposition-exec',
    actorId: 'hero',
    targetId: 'npc-exec-contract',
    store,
    lootSeed: 'disposition.execute'
  })
  expect(getNpc('npc-exec-contract')?.defeatDisposition).toMatchObject({
    disposition: 'executed',
    source: { encounterId: 'enc-disposition-exec', actorId: 'hero' }
  })
}

function assertLootGenerationContract(dataRoot: string): void {
  const store = createJsonEncounterStore({ dataRoot })
  startEncounter(
    {
      encounterId: 'enc-loot-contract',
      combatants: [
        heroCombatant('hero'),
        {
          id: 'bandit',
          kind: 'enemy',
          abilityScores: { Body: 10, Agility: 10, Mind: 8, Presence: 8 },
          hp: { current: 4, max: 10 }
        }
      ],
      store
    },
    { roller: () => 10 }
  )
  const seed = 'combat.loot.contract'
  const result = resolveNonLethalVictory({
    encounterId: 'enc-loot-contract',
    actorId: 'hero',
    targetId: 'bandit',
    store,
    lootSeed: seed,
    lootDifficulty: 'easy'
  })
  expect(result.loot).toEqual(generateLoot({ seed, difficulty: 'easy' }))
  expect(result.loot.length).toBeGreaterThan(0)
}

function heroCombatant(id: string) {
  return {
    id,
    kind: 'character' as const,
    abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 }
  }
}

function dispositionIds(kind: 'flee' | 'yield' | 'down' | 'exec') {
  return {
    npcId: `npc-${kind}-contract`,
    campaignId: `campaign-disposition-${kind}`,
    worldId: `world-disposition-${kind}`,
    regionId: `region-disposition-${kind}`,
    civilizationId: `civ-disposition-${kind}`
  }
}

function forceCurrentTurn(
  store: ReturnType<typeof createJsonEncounterStore>,
  started: ReturnType<typeof startEncounter>,
  combatantId: string
): void {
  store.saveEncounter({
    ...started,
    currentTurnIndex: started.turnOrder.indexOf(combatantId),
    currentTurn: { combatantId, actionUsed: false, movementUsed: false }
  })
}

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

async function buildNpcContractCombatant(
  ids: {
    npcId: string
    campaignId: string
    worldId: string
    regionId: string
    civilizationId: string
  } = {
    npcId: 'npc-guard-contract',
    campaignId: 'campaign-npc-contract',
    worldId: 'world-npc-contract',
    regionId: 'region-npc-contract',
    civilizationId: 'civ-npc-contract'
  }
) {
  setCampaignRaceRoster(ids.campaignId, [{ raceId: 'human', name: 'Human' }])
  const [slot] = ensureNpcPlaceholders({
    worldId: ids.worldId,
    civilizationId: ids.civilizationId,
    regionId: ids.regionId,
    roleHints: ['guard']
  })
  expect(slot).toBeDefined()
  if (slot === undefined) {
    throw new Error('Expected NPC placeholder slot')
  }
  constructNpc({
    campaignId: ids.campaignId,
    worldId: ids.worldId,
    npcId: ids.npcId,
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'alert',
    abilityScores: { Body: 12, Agility: 16, Mind: 10, Presence: 10 }
  })
  hydrateNpcCombatTier({
    npcId: ids.npcId,
    tierId: 'guard',
    level: 2,
    hitDie: 8,
    rolls: [6, 5],
    armorClass: 13
  })

  return hydrateCombatantFromNpcId(ids.npcId)
}
