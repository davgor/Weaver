import { createCivilizationStore } from '../store/civilizationStore.js'
import {
  CIVILIZATION_SLICE_VERSION,
  type CivilizationCampaignSlice,
  type CivilizationPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: CivilizationPortabilityContext): CivilizationCampaignSlice {
  const store = createCivilizationStore(ctx.dataRoot)
  const civilizations = store.listCivilizations(ctx.worldId).map((record) => ({
    record,
    claimedCells: claimedCellsFor(store, ctx.worldId, record.civilizationId)
  }))
  return {
    sliceVersion: CIVILIZATION_SLICE_VERSION,
    campaignId: ctx.campaignId,
    worldId: ctx.worldId,
    civilizations,
    slots: store.listSlots(ctx.worldId)
  }
}

function claimedCellsFor(
  store: ReturnType<typeof createCivilizationStore>,
  worldId: string,
  civilizationId: string
) {
  return store.listClaimedCells(worldId).filter((cell) => {
    return store.getAt(worldId, cell.x, cell.y)?.civilizationId === civilizationId
  })
}
