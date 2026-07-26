import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendAskDmEntry,
  exportAskDmHistory,
  getAskDmHistory,
  importAskDmHistory,
  resetAskDmHistoryStore
} from './askDmHistory.js'

beforeEach(() => {
  resetAskDmHistoryStore()
})

describe('askDmHistory store', () => {
  it('clones history on read and write', () => {
    const history = appendAskDmEntry({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      speaker: 'player',
      text: 'Question one'
    })

    history.entries.push({ speaker: 'dm', text: 'mutated' })
    const stored = getAskDmHistory('camp-1', 'pc-1')

    expect(stored?.entries).toEqual([{ speaker: 'player', text: 'Question one' }])
  })

  it('round-trips through export and import', () => {
    appendAskDmEntry({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      speaker: 'player',
      text: 'First'
    })
    appendAskDmEntry({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      speaker: 'dm',
      text: 'Reply'
    })

    const exported = exportAskDmHistory()
    resetAskDmHistoryStore()
    importAskDmHistory(exported)

    expect(getAskDmHistory('camp-1', 'pc-1')?.entries).toEqual([
      { speaker: 'player', text: 'First' },
      { speaker: 'dm', text: 'Reply' }
    ])
  })
})
