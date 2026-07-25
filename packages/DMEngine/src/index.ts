
import type { CombatEngineApi } from '@weaver/combat-engine'
import type { WorldEngineApi } from '@weaver/world-engine'
import type { NarrationEngineApi } from '@weaver/narration-engine'
import type { ItemEngineApi } from '@weaver/item-engine'
import type { NpcEngineApi } from '@weaver/npc-engine'
import type { EnemyEngineApi } from '@weaver/enemy-engine'

export type DmEngineDeps = {
  combat: CombatEngineApi
  world: WorldEngineApi
  narration: NarrationEngineApi
  items: ItemEngineApi
  npcs: NpcEngineApi
  enemies: EnemyEngineApi
}
export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type DmEngineApi = {
  id: 'DMEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/dm-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'describeRole',
      description: 'Describe how the DM engine should use peer engines via API calls',
      invoke: () => ({
        invents: false,
        pullsFrom: [
          'combat-engine',
          'world-engine',
          'narration-engine',
          'item-engine',
          'npc-engine',
          'enemy-engine'
        ],
        note: 'DMEngine orchestrates; it does not invent world or combat facts itself.'
      })
    }
  ]
}

export const dmEngine: DmEngineApi = {
  id: 'DMEngine',
  title: 'DM Engine',
  description: 'LLM story control via API calls into other engines',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((e) => e.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}
