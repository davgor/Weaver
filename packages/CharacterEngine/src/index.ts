export * from './abilities.js'
export * from './abilityScoreGeneration.js'
export type { CharacterEngineApi, EngineEndpoint } from './endpoints.js'
export * from './errors.js'
export * from './hp.js'
export * from './raceBackground.js'
export * from './records.js'
export * from './timeRest.js'

import { buildEndpoints, health, type CharacterEngineApi } from './endpoints.js'

export const characterEngine: CharacterEngineApi = {
  id: 'CharacterEngine',
  title: 'Character Engine',
  description: 'Deterministic player-character facts and resolution model',
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
