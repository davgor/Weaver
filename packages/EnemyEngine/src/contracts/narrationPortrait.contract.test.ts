import { beforeEach, describe, expect, it } from 'vitest'
import { generatePortrait, type ImageProvider } from '@weaver/narration-engine'
import {
  clearEnemyStore,
  generateEncounterFoes,
  getGeneratedFoe,
  requestCombatToken
} from '../index.js'

describe('EnemyEngine -> NarrationEngine portrait contract', () => {
  beforeEach(() => {
    clearEnemyStore()
  })

  it('uses the real generatePortrait export for enemy combat tokens', async () => {
    const [foe] = generateEncounterFoes({ difficulty: 'easy' })
    const provider: ImageProvider = {
      id: 'local',
      generate: async () => '/tokens/contract-goblin.png'
    }

    requestCombatToken({
      foeId: requireFoeId(foe),
      prompt: 'goblin encounter token',
      settings: { provider: 'local', generativeTokensEnabled: true }
    }, {
      generatePortrait,
      providers: { local: provider }
    })
    await flushMicrotasks()

    expect(getGeneratedFoe(requireFoeId(foe))?.combatToken).toEqual({
      imagePath: '/tokens/contract-goblin.png',
      provider: 'local'
    })
  })
})

function requireFoeId(foe: { foeId: string } | undefined): string {
  if (foe === undefined) {
    throw new Error('Expected generated foe')
  }
  return foe.foeId
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
