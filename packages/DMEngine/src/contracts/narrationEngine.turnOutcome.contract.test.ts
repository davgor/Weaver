import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNarrationStore,
  generateScene,
  projectScene,
  type NarrationPeers,
  type TextCompleter
} from '@weaver/narration-engine'
import { buildTurnNarrationPrompt } from '../turnRouting/branches/narration.js'

beforeEach(() => {
  clearNarrationStore()
})

describe('DMEngine -> NarrationEngine turn outcome contract (063)', () => {
  it('narrates resolved commerce facts through generateScene without inventing mechanics', async () => {
    const peers = narrationPeers(
      scriptedCompleter(
        'You tuck the iron sword into your belt.\n<<<CLAIMS\nitemExists:item.contract-sword\n>>>'
      )
    )
    const prompt = buildTurnNarrationPrompt({
      route: 'commerce',
      resolution: {
        kind: 'buy',
        itemId: 'item.contract-sword',
        price: 12,
        balance: { characterId: 'pc-contract', balance: 88 }
      },
      playerText: 'I buy the iron sword'
    })

    const outcome = await generateScene({ prompt }, peers)

    expect(outcome.status).toBe('persisted')
    expect(outcome.prose).toContain('iron sword')
    expect(projectScene().map((block) => block.text)).toEqual([outcome.prose])
  })
})

function narrationPeers(completer: TextCompleter): NarrationPeers {
  return {
    llm: completer,
    npcs: { getNpc: () => undefined },
    items: { hasItem: (itemId) => itemId === 'item.contract-sword' },
    locations: { isKnownLocation: () => true }
  }
}

function scriptedCompleter(text: string): TextCompleter {
  return {
    completeText: async () => ({ text, backend: 'scripted' })
  }
}
