import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCampaign, openCampaign } from '../campaignPersistence.js'
import { createSqliteOnboardingStore } from './sqliteOnboardingStore.js'

describe('sqlite onboarding store', () => {
  it('persists onboarding records, guided state, and active hub cursor across reopen', () => {
    withCampaignPath((filePath) => {
      const created = createCampaign({ campaignId: 'durable-onboarding', filePath, now: nowOne })
      const store = createSqliteOnboardingStore(created.getDb(), { now: nowOne })
      seedResumeState(store)
      created.close()

      const reopened = openCampaign({ campaignId: 'durable-onboarding', filePath })
      const resumed = createSqliteOnboardingStore(reopened.getDb(), { now: nowTwo })

      assertResumeState(resumed)
      reopened.close()
    })
  })

  it('deletes onboarding records and guided state independently', () => {
    withCampaignPath((filePath) => {
      const handle = createCampaign({ campaignId: 'delete-onboarding', filePath })
      const store = createSqliteOnboardingStore(handle.getDb())
      store.saveRecord({
        campaignId: 'delete-onboarding',
        characterId: 'pc-2',
        characterName: 'Briar',
        phase: 'background',
        selections: { raceId: 'human' }
      })
      store.saveGuidedState({
        campaignId: 'delete-onboarding',
        characterId: 'pc-2',
        guidedCreationPhase: 'who',
        transcript: [],
        characterFacts: {},
        enterWorldUnlocked: false
      })

      store.deleteRecord('pc-2')
      expect(store.loadRecord('pc-2')).toBeUndefined()
      expect(store.loadGuidedState('pc-2')).toBeDefined()
      store.deleteGuidedState('pc-2')
      expect(store.loadGuidedState('pc-2')).toBeUndefined()
      handle.close()
    })
  })
})

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-onboarding-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

function seedResumeState(store: ReturnType<typeof createSqliteOnboardingStore>): void {
  store.saveRecord({
    campaignId: 'durable-onboarding',
    characterId: 'pc-1',
    characterName: 'Ilyra',
    phase: 'race',
    selections: { archetype: 'Ranger' }
  })
  store.saveGuidedState({
    campaignId: 'durable-onboarding',
    characterId: 'pc-1',
    guidedCreationPhase: 'why',
    transcript: [{ speaker: 'player', phase: 'who', text: 'Ilyra remembers the road.' }],
    characterFacts: { vow: 'find the lantern' },
    enterWorldUnlocked: false
  })
  store.setActiveCharacterId('pc-1')
}

function assertResumeState(store: ReturnType<typeof createSqliteOnboardingStore>): void {
  expect(store.loadRecord('pc-1')).toMatchObject({
    campaignId: 'durable-onboarding',
    characterId: 'pc-1',
    characterName: 'Ilyra',
    phase: 'race',
    selections: { archetype: 'Ranger' },
    updatedAt: '2026-07-27T06:20:00.000Z'
  })
  expect(store.listRecords('durable-onboarding').map((record) => record.characterId)).toEqual([
    'pc-1'
  ])
  expect(store.loadGuidedState('pc-1')?.transcript[0]?.text).toBe('Ilyra remembers the road.')
  expect(store.getActiveCharacterId()).toBe('pc-1')
}

function nowOne(): string {
  return '2026-07-27T06:20:00.000Z'
}

function nowTwo(): string {
  return '2026-07-27T06:25:00.000Z'
}
