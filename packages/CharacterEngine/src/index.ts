export * from './abilities.js'
export * from './abilityScoreGeneration.js'
export * from './archetypes.js'
export * from './autosave.js'
export * from './companions.js'
export * from './conditions.js'
export * from './damageTypes.js'
export * from './deathModes.js'
export * from './dying.js'
export type { CharacterEngineApi, EngineEndpoint } from './endpoints.js'
export * from './emergentDirection.js'
export * from './errors.js'
export * from './featureTemplates.js'
export * from './hp.js'
export * from './inactiveProxy.js'
export * from './levelUp.js'
export * from './location.js'
export * from './obituary.js'
export * from './raceBackground.js'
export * from './records.js'
export * from './restRecovery.js'
export * from './startingLoadout.js'
export * from './timeRest.js'
export * from './xp.js'

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

export {
  exportCampaignSlice as exportCharacterCampaignSlice,
  importCampaignSlice as importCharacterCampaignSlice,
  CHARACTER_SLICE_VERSION,
  CharacterPortabilitySchemaError,
  type CharacterCampaignSlice,
  type CharacterPortabilityContext
} from './portability/index.js'
