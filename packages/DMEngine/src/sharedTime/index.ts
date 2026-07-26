export type {
  AppendCausalEventInput,
  CausalEvent,
  CharacterDayCounterApi,
  CharacterSessionCursor,
  SessionRecap,
  SessionRecapInput
} from './types.js'

export {
  appendCausalEvent,
  exportCausalTimelineStore,
  importCausalTimelineStore,
  listCausalEvents,
  listEventsSince,
  resetCausalTimelineStore
} from './causalTimeline.js'

export { compareCausalOrder, sortEventsByCausalOrder } from './turnOrderPolicy.js'

export {
  buildSessionRecap,
  exportCharacterSessionCursorStore,
  getCharacterSessionCursor,
  importCharacterSessionCursorStore,
  recordCharacterSessionCursor,
  resetCharacterSessionCursorStore
} from './sessionRecap.js'

import type { CharacterDayCounterApi } from './types.js'

export function getSharedCampaignDay(
  campaignId: string,
  characterApi: CharacterDayCounterApi
): number {
  return characterApi.getCampaignDay(campaignId)
}
