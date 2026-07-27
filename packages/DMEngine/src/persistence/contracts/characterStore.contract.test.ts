import {
  addJournalEntry,
  getCharacterStats,
  learnKnownAction,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  persistCharacterMaxHp,
  setCharacterLocation,
  unbindCharacterFactStore,
  upsertQuest,
  writeLogBookEvent
} from '@weaver/character-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCampaignSession,
  openCampaignSession
} from '../campaignSession.js'

describe('character campaign store contract', () => {
  afterEach(() => {
    unbindCharacterFactStore()
  })

  it('round-trips character facts through SQLite reopen', () => {
    withCampaignPath((filePath) => {
      const created = createCampaignSession({ campaignId: 'char-camp', filePath })
      persistCharacterMaxHp({ characterId: 'pc-1', hitDie: 8, level: 1, bodyMod: 2 })
      addJournalEntry({ characterId: 'pc-1', text: 'Met a guide', linkedNpcId: 'npc-1' })
      writeLogBookEvent({
        characterIds: ['pc-1'],
        type: 'travel',
        payload: { to: 'harbor' }
      })
      upsertQuest({
        characterId: 'pc-1',
        questId: 'q-1',
        kind: 'main',
        status: 'active',
        title: 'Find the gate'
      })
      learnKnownAction('pc-1', 'action.strike')
      setCharacterLocation({
        characterId: 'pc-1',
        campaignId: 'char-camp',
        regionId: 'region-1',
        locationKind: 'overworld',
        updatedDay: 3
      })
      const before = snapshot('pc-1')
      created.close()

      unbindCharacterFactStore()
      expect(getCharacterStats('pc-1')).toBeUndefined()

      const opened = openCampaignSession({ campaignId: 'char-camp', filePath })
      expect(snapshot('pc-1')).toEqual(before)
      opened.close()
    })
  })
})

function snapshot(characterId: string) {
  return {
    stats: getCharacterStats(characterId),
    journal: listJournalEntries(characterId),
    logBook: listLogBookEntries(characterId),
    quests: listQuestLog(characterId),
    knownActions: listKnownActions(characterId)
  }
}

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-character-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
