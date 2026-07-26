export type { EngineEndpoint, NpcEngineApi } from './typesApi.js'
export type * from './types.js'
export { NpcEngineError } from './errors.js'
export type { NpcEngineErrorCode } from './errors.js'
export { constructNpc } from './construction.js'
export { clearNpcStore, getNpc } from './store.js'
export { appendNpcMemory, appendWorldFact, listWorldFactsMentioningNpc, queryNpcGroundingContext } from './memory.js'
export { clearDmOpinionStore, getNpcDossier, upsertDmNpcOpinion } from './dossier.js'
export { hydrateNpcCombatTier, setNpcDefeatDisposition } from './combatDisposition.js'
export {
  addNpcToFaction,
  clearFactionStore,
  createFaction,
  getFactionRelation,
  getReputationStanding,
  listCharacterReputationStandings,
  setFactionRelation,
  updateReputation
} from './factions.js'
export {
  clearOpinionStore,
  listNpcOpinionsAbout,
  listNpcOpinionsHeldBy,
  upsertNpcOpinion
} from './opinions.js'
export { requestCompanionPortrait, requestNpcPortrait } from './portraitHook.js'
export { selectSocialResponders, updateNpcSpeakingStyle } from './speakingStyle.js'

import { buildEndpoints, health } from './endpoints.js'
import type { NpcEngineApi } from './typesApi.js'

export const npcEngine: NpcEngineApi = {
  id: 'NPCEngine',
  title: 'NPC Engine',
  description: 'Construct NPCs for campaigns',
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
