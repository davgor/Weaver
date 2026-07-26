import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNarrationStore,
  generateScene,
  projectScene,
  projectSocial,
  streamSocial,
  type NarrationPeers
} from '@weaver/narration-engine'

describe('ElectronAITTRPG contract: NarrationEngine prose projection APIs', () => {
  beforeEach(() => {
    clearNarrationStore()
  })

  it('persists scene projection and streams social chunks before final social projection', async () => {
    const peers = narrationPeers('The braziers flare.\n<<<CLAIMS\n>>>')
    await generateScene({ prompt: 'Describe the room' }, peers)

    const socialEvents = []
    for await (const event of streamSocial(
      { prompt: 'Mira warns them', speakerId: 'mira', kind: 'npc' },
      narrationPeers('Stay close.\n<<<CLAIMS\n>>>')
    )) {
      socialEvents.push(event)
    }

    expect(projectScene()[0]?.text).toBe('The braziers flare.')
    expect(socialEvents[0]).toMatchObject({ type: 'chunk' })
    expect(projectSocial()[0]?.text).toBe('Stay close.')
  })
})

function narrationPeers(text: string): NarrationPeers {
  return {
    llm: { completeText: async () => ({ text, backend: 'test' }) },
    npcs: { getNpc: () => undefined },
    items: { hasItem: () => true },
    locations: { isKnownLocation: () => true }
  }
}
