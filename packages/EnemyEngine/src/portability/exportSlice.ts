import { listBestiary } from '../bestiary.js'
import { listGeneratedFoes } from '../store.js'
import { ENEMY_SLICE_VERSION, type EnemyCampaignSlice, type EnemyPortabilityContext } from './types.js'

export function exportCampaignSlice(_ctx: EnemyPortabilityContext): EnemyCampaignSlice {
  return {
    sliceVersion: ENEMY_SLICE_VERSION,
    campaignId: _ctx.campaignId,
    bestiaryIds: listBestiary().map((entry) => entry.bestiaryId),
    generatedFoes: listGeneratedFoes()
  }
}
