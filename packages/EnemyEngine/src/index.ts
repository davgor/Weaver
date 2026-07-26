export type { EnemyEngineApi, EngineEndpoint } from './types.js'
export type * from './types.js'
export { getBestiaryEntry, hydrateBestiaryEntry, listBestiary } from './bestiary.js'
export { assignQuestFoes, generateEncounterFoes, hydrateCombatantFromFoe } from './generation.js'
export { clearEnemyStore, getGeneratedFoe } from './store.js'
export { requestCombatToken } from './tokenHook.js'

import { buildEndpoints, health } from './endpoints.js'
import type { EnemyEngineApi } from './types.js'

export const enemyEngine: EnemyEngineApi = {
  id: 'EnemyEngine',
  title: 'Enemy Engine',
  description: 'Construct enemies for combat encounters',
  health,
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpoint)
    if (match === undefined) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}
