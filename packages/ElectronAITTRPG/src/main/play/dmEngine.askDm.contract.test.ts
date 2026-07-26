import { beforeEach, describe, expect, it } from 'vitest'
import {
  askTheDm,
  getAskDmHistory,
  resetAskDmHistoryStore,
  type AskDmNarrationApi
} from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'

describe('ElectronAITTRPG contract: DMEngine askTheDm API', () => {
  beforeEach(() => {
    resetAskDmHistoryStore()
  })

  it('answers an out-of-character question and stores OOC history separately', async () => {
    const result = await askTheDm({
      campaignId: 'camp-ask',
      characterId: 'pc-ask',
      question: 'Can I use an Action after moving?',
      facts: { movement: 'Movement does not spend your Action.' },
      narration: narration(),
      completer: completer()
    })

    expect(result).toMatchObject({ ok: true, answer: 'Movement does not spend your Action.' })
    expect(getAskDmHistory('camp-ask', 'pc-ask')?.entries.map((entry) => entry.speaker)).toEqual([
      'player',
      'dm'
    ])
  })
})

function narration(): AskDmNarrationApi {
  return {
    fillAndValidate: async () => ({
      ok: true,
      filled: { ANSWER: 'Movement does not spend your Action.' },
      errors: []
    })
  }
}

function completer(): TextCompleter {
  return { completeText: async () => ({ text: 'unused', backend: 'test' }) }
}
