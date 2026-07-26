import { beforeEach, describe, expect, it } from 'vitest'
import { generatePortrait, type ImageProvider } from '@weaver/narration-engine'
import { clearNpcStore, getNpc, requestNpcPortrait } from '../index.js'
import { seedNpc } from '../testHelpers.js'

describe('NPCEngine -> NarrationEngine portrait contract', () => {
  beforeEach(() => {
    clearNpcStore()
  })

  it('uses the real generatePortrait export for NPC portrait hooks', async () => {
    seedNpc({ npcId: 'npc-narration-contract' })
    const provider: ImageProvider = {
      id: 'local',
      generate: async () => '/portraits/contract.png'
    }

    requestNpcPortrait({
      npcId: 'npc-narration-contract',
      prompt: 'caller accepted portrait prompt',
      settings: { provider: 'local', generativeTokensEnabled: true }
    }, {
      generatePortrait,
      providers: { local: provider }
    })
    await flushMicrotasks()

    expect(getNpc('npc-narration-contract')?.portrait).toEqual({
      imagePath: '/portraits/contract.png',
      provider: 'local'
    })
  })
})

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
