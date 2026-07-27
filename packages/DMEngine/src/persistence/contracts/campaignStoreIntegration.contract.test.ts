import {
  isCharacterCampaignStoreBound,
  unbindCharacterFactStore
} from '@weaver/character-engine'
import { isEnemyCampaignStoreBound, unbindEnemyCampaignStore } from '@weaver/enemy-engine'
import { isItemCampaignStoreBound, unbindItemCampaignStores } from '@weaver/item-engine'
import {
  isNarrationCampaignStoreBound,
  unbindNarrationCampaignStore
} from '@weaver/narration-engine'
import { isNpcCampaignStoreBound, unbindNpcCampaignStore } from '@weaver/npc-engine'
import { isQuestCampaignStoreBound, unbindQuestCampaignStore } from '@weaver/quest-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  assertCampaignStoresBound,
  createCampaignSession,
  getActiveCampaignSession
} from '../campaignSession.js'

describe('campaign store integration (106.5)', () => {
  afterEach(() => {
    getActiveCampaignSession()?.close()
    unbindCharacterFactStore()
    unbindItemCampaignStores()
    unbindNpcCampaignStore()
    unbindEnemyCampaignStore()
    unbindQuestCampaignStore()
    unbindNarrationCampaignStore()
  })

  it('binds every engine store while a campaign session is open', () => {
    withCampaignPath((filePath) => {
      const session = createCampaignSession({ campaignId: 'bound', filePath })
      expect(session.isStoreBound()).toBe(true)
      expect(allBoundFlags()).toEqual({
        character: true,
        item: true,
        npc: true,
        enemy: true,
        quest: true,
        narration: true
      })
      expect(() => assertCampaignStoresBound()).not.toThrow()
      session.close()
      expect(getActiveCampaignSession()).toBeNull()
      expect(allBoundFlags()).toEqual({
        character: false,
        item: false,
        npc: false,
        enemy: false,
        quest: false,
        narration: false
      })
      expect(() => assertCampaignStoresBound()).toThrow(/not bound/)
    })
  })
})

function allBoundFlags() {
  return {
    character: isCharacterCampaignStoreBound(),
    item: isItemCampaignStoreBound(),
    npc: isNpcCampaignStoreBound(),
    enemy: isEnemyCampaignStoreBound(),
    quest: isQuestCampaignStoreBound(),
    narration: isNarrationCampaignStoreBound()
  }
}

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-store-integration-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
