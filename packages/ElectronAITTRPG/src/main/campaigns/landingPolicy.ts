import type { CampaignCharacterLandingRecord } from '../../shared/campaigns/types.js'

export function shouldLandOnHub(characters: readonly CampaignCharacterLandingRecord[]): boolean {
  return characters.some((character) => character.phase === 'complete')
}
