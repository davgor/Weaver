import { describe, expect, it } from 'vitest'
import {
  addJournalEntry,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  learnKnownAction,
  upsertQuest,
  writeLogBookEvent
} from './index.js'

describe('character record stores', () => {
  it('stores journal entries per character and can filter by linked NPC', () => {
    addJournalEntry({
      characterId: 'pc-journal-a',
      text: 'Met a suspicious guide.',
      createdAt: '2026-07-26T00:00:00.000Z',
      linkedNpcId: 'npc-guide'
    })
    addJournalEntry({
      characterId: 'pc-journal-b',
      text: 'Different character note.',
      createdAt: '2026-07-26T00:01:00.000Z'
    })

    expect(listJournalEntries('pc-journal-a')).toHaveLength(1)
    expect(listJournalEntries('pc-journal-b')).toHaveLength(1)
    expect(listJournalEntries('pc-journal-a', { linkedNpcId: 'npc-guide' })[0]?.text).toBe(
      'Met a suspicious guide.'
    )
  })

  it('writes one structured log event to multiple explicit characters', () => {
    const entries = writeLogBookEvent({
      characterIds: ['pc-log-a', 'pc-log-b'],
      type: 'combat.victory',
      payload: { encounterId: 'enc-1' },
      createdAt: '2026-07-26T00:02:00.000Z'
    })

    expect(entries).toHaveLength(2)
    expect(listLogBookEntries('pc-log-a')).toEqual([entries[0]])
    expect(listLogBookEntries('pc-log-b')).toEqual([entries[1]])
    expect(listLogBookEntries('pc-log-c')).toEqual([])
  })

  it('tracks stable main and side quest ids with statuses', () => {
    upsertQuest({
      characterId: 'pc-quest',
      questId: 'quest-main',
      kind: 'main',
      status: 'active',
      title: 'Find the Spindle'
    })
    upsertQuest({
      characterId: 'pc-quest',
      questId: 'quest-side',
      kind: 'side',
      status: 'complete',
      title: 'Return the Lantern'
    })
    upsertQuest({
      characterId: 'pc-quest',
      questId: 'quest-main',
      kind: 'main',
      status: 'failed',
      title: 'Find the Spindle'
    })

    expect(listQuestLog('pc-quest')).toEqual([
      {
        questId: 'quest-main',
        kind: 'main',
        status: 'failed',
        title: 'Find the Spindle'
      },
      {
        questId: 'quest-side',
        kind: 'side',
        status: 'complete',
        title: 'Return the Lantern'
      }
    ])
  })

  it('stores known action ids only and isolates them by character', () => {
    learnKnownAction('pc-actions-a', 'spell.spark')
    learnKnownAction('pc-actions-a', 'classAction.guard')
    learnKnownAction('pc-actions-a', 'spell.spark')
    learnKnownAction('pc-actions-b', 'spell.mend')

    expect(listKnownActions('pc-actions-a')).toEqual(['classAction.guard', 'spell.spark'])
    expect(listKnownActions('pc-actions-b')).toEqual(['spell.mend'])
  })
})
