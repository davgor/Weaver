import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createCampaignSession,
  getActiveCampaignSession,
  type TurnPersistRecord
} from '@weaver/dm-engine'
import { itemEngine } from '@weaver/item-engine'
import { setCharacterLocation } from '@weaver/character-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import {
  CampaignLivePlayError,
  createCampaignLivePlayDeps
} from './createCampaignLivePlayDeps.js'

const roots: string[] = []
const completer: TextCompleter = {
  completeText: async () => ({ text: 'ok', backend: 'claude' })
}

beforeEach(() => {
  getActiveCampaignSession()?.close()
})

afterEach(() => {
  getActiveCampaignSession()?.close()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('createCampaignLivePlayDeps factory', () => {
  it('opens the campaign session and injects SQLite-backed currency', () => {
    const campaignsRoot = tempRoot()
    const campaignId = 'live-play-camp'
    seedCampaign(campaignsRoot, campaignId)

    const { session, resolveTurnDeps } = createCampaignLivePlayDeps({
      campaignId,
      characterId: 'pc-hero',
      campaignsRoot,
      textCompleter: completer
    })

    expect(session.campaignId).toBe(campaignId)
    expect(session.isStoreBound()).toBe(true)
    resolveTurnDeps.currency.credit('pc-hero', 12)
    expect(resolveTurnDeps.currency.getBalance('pc-hero')).toBe(12)
  })

  it('rejects a blank campaign id with a clear error', () => {
    expect(() =>
      createCampaignLivePlayDeps({
        campaignId: '  ',
        characterId: 'pc-hero',
        campaignsRoot: tempRoot(),
        textCompleter: completer
      })
    ).toThrow(CampaignLivePlayError)
  })

  it('uses real NPC and location peers instead of always-true stubs', () => {
    const campaignsRoot = tempRoot()
    const campaignId = 'peer-camp'
    seedCampaign(campaignsRoot, campaignId)
    const deps = createCampaignLivePlayDeps({
      campaignId,
      characterId: 'pc-hero',
      campaignsRoot,
      textCompleter: completer
    }).resolveTurnDeps
    setCharacterLocation({
      characterId: 'pc-hero',
      campaignId,
      regionId: 'region-harbor',
      placeId: 'docks',
      locationKind: 'settlement'
    })

    expect(deps.narration.npcs.getNpc('missing')).toBeUndefined()
    expect(deps.narration.locations?.isKnownLocation('docks')).toBe(true)
    expect(deps.narration.locations?.isKnownLocation('unknown-place')).toBe(false)
  })

  it('persists turn records under the campaign data root', () => {
    const campaignsRoot = tempRoot()
    const campaignId = 'persist-camp'
    seedCampaign(campaignsRoot, campaignId)
    const deps = createCampaignLivePlayDeps({
      campaignId,
      characterId: 'pc-hero',
      campaignsRoot,
      textCompleter: completer
    }).resolveTurnDeps
    const record = samplePersistRecord(campaignId)
    deps.persist(record)
    const turnsDir = join(campaignsRoot, campaignId, 'data', 'turns')
    const files = readdirSync(turnsDir)
    expect(files.length).toBe(1)
    const stored = JSON.parse(readFileSync(join(turnsDir, files[0]!), 'utf8')) as TurnPersistRecord
    expect(stored.characterId).toBe('pc-hero')
    expect(stored.route).toBe('narration')
  })

  it('consults inventory for item claims', () => {
    const campaignsRoot = tempRoot()
    const campaignId = 'item-camp'
    seedCampaign(campaignsRoot, campaignId)
    createCampaignLivePlayDeps({
      campaignId,
      characterId: 'pc-hero',
      campaignsRoot,
      textCompleter: completer
    })
    itemEngine.defineTemplate({ id: 'sword.basic', name: 'Sword' })
    itemEngine.createInventory('pc-hero')
    itemEngine.addItem('pc-hero', 'sword.basic')
    const deps = createCampaignLivePlayDeps({
      campaignId,
      characterId: 'pc-hero',
      campaignsRoot,
      textCompleter: completer
    }).resolveTurnDeps
    expect(deps.narration.items?.hasItem('sword.basic')).toBe(true)
    expect(deps.narration.items?.hasItem('missing.item')).toBe(false)
  })
})

function seedCampaign(campaignsRoot: string, campaignId: string): void {
  createCampaignSession({
    campaignId,
    filePath: join(campaignsRoot, campaignId, 'campaign.sqlite')
  }).close()
}

function samplePersistRecord(campaignId: string): TurnPersistRecord {
  return {
    campaignId,
    characterId: 'pc-hero',
    route: 'narration',
    resolution: {
      kind: 'narration',
      text: 'Hello'
    },
    narration: {
      kind: 'scene',
      status: 'persisted',
      prose: 'A quiet dock.'
    }
  }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'live-play-deps-'))
  roots.push(root)
  return root
}
