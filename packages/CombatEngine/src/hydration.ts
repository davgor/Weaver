import type { EnemyCombatantSnapshot, GeneratedFoeRef } from '@weaver/enemy-engine'
import type { NpcCombatStats, NpcRecord } from '@weaver/npc-engine'
import type { EncounterCombatantInput, HitPointState } from './types.js'

type NpcModule = {
  getNpc: (npcId: string) => NpcRecord | undefined
}

type EnemyModule = {
  hydrateCombatantFromFoe: (foe: GeneratedFoeRef) => EnemyCombatantSnapshot
}

export async function hydrateCombatantFromNpcId(npcId: string): Promise<EncounterCombatantInput> {
  const { getNpc } = await importNpcEngine()
  const npc = getNpc(npcId)
  if (npc === undefined) {
    throw new Error(`NPC not found: ${npcId}`)
  }
  return hydrateCombatantFromNpcRecord(npc)
}

export function hydrateCombatantFromNpcRecord(npc: NpcRecord): EncounterCombatantInput {
  return {
    id: npc.npcId,
    kind: 'npc',
    displayName: npc.displayName ?? npc.identity.background?.name ?? npc.npcId,
    abilityScores: { ...npc.abilityScores },
    hp: npcHitPoints(npc.combatStats),
    ...npcArmorClass(npc.combatStats)
  }
}

export async function hydrateCombatantFromFoeRef(
  foe: GeneratedFoeRef
): Promise<EncounterCombatantInput> {
  const { hydrateCombatantFromFoe } = await importEnemyEngine()
  return hydrateCombatantFromEnemySnapshot(hydrateCombatantFromFoe(foe))
}

export function hydrateCombatantFromEnemySnapshot(
  snapshot: EnemyCombatantSnapshot
): EncounterCombatantInput {
  return {
    id: snapshot.id,
    kind: 'enemy',
    displayName: snapshot.name,
    abilityScores: { ...snapshot.abilities.scores },
    hp: { current: snapshot.hp.current, max: snapshot.hp.max },
    damageResistances: [...snapshot.damageTypes.resisted],
    damageVulnerabilities: [...snapshot.damageTypes.vulnerable]
  }
}

function npcHitPoints(stats: NpcCombatStats): HitPointState {
  return { current: stats.currentHp, max: stats.maxHp }
}

function npcArmorClass(stats: NpcCombatStats): { armorClass?: number } {
  return stats.kind === 'combatant' && stats.armorClass !== undefined
    ? { armorClass: stats.armorClass }
    : {}
}

async function importNpcEngine(): Promise<NpcModule> {
  const module = await import('@weaver/npc-engine')
  return module as NpcModule
}

async function importEnemyEngine(): Promise<EnemyModule> {
  const module = await import('@weaver/enemy-engine')
  return module as EnemyModule
}
