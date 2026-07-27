import {
  openCampaign,
  type CampaignOpenOptions
} from '../persistence/campaignPersistence.js'
import { upsertCampaignMeta } from '../persistence/campaignMeta.js'
import {
  openCampaignSession,
  type CampaignSession
} from '../persistence/campaignSession.js'

export type PermanentizeVnStoryResult = {
  lifecycle: 'permanent'
  session: CampaignSession
}

/**
 * Marks a draft VN story campaign as permanent and opens a play session
 * (binds campaign stores). Used by ElectronAIVN epic 122.
 */
export function permanentizeVnStory(
  options: CampaignOpenOptions
): PermanentizeVnStoryResult {
  const handle = openCampaign(options)
  try {
    upsertCampaignMeta(handle, 'lifecycle', 'permanent')
  } finally {
    handle.close()
  }
  return {
    lifecycle: 'permanent',
    session: openCampaignSession(options)
  }
}
