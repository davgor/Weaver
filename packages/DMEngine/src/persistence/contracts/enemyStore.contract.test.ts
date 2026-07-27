import {
  getGeneratedFoe,
  listGeneratedFoes,
  requestCombatToken,
  saveGeneratedFoe,
  unbindEnemyCampaignStore
} from '@weaver/enemy-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaignSession, openCampaignSession } from '../campaignSession.js'

describe('enemy campaign store contract', () => {
  afterEach(() => {
    unbindEnemyCampaignStore()
  })

  it('round-trips generated foes and combat token cache through SQLite reopen', async () => {
    await withCampaignPath(async (filePath) => {
      const created = createCampaignSession({ campaignId: 'enemy-camp', filePath })
      saveGeneratedFoe(foe('foe-1'))
      requestCombatToken(tokenRequest('foe-1'), {
        generatePortrait: async () => ({ imagePath: '/tokens/goblin.png', provider: 'local', degraded: false })
      })
      await flushMicrotasks()
      const before = listGeneratedFoes()
      created.close()

      unbindEnemyCampaignStore()
      expect(listGeneratedFoes()).toEqual([])

      const opened = openCampaignSession({ campaignId: 'enemy-camp', filePath })
      expect(listGeneratedFoes()).toEqual(before)

      let calls = 0
      saveGeneratedFoe(foe('foe-2'))
      const result = requestCombatToken(tokenRequest('foe-2'), {
        generatePortrait: async () => {
          calls += 1
          return { imagePath: '/tokens/unused.png', provider: 'local', degraded: false }
        }
      })
      expect(result).toEqual({ queued: false, foeId: 'foe-2', fromCache: true })
      expect(calls).toBe(0)
      expect(getGeneratedFoe('foe-2')?.combatToken?.imagePath).toBe('/tokens/goblin.png')
      opened.close()
    })
  })
})

function foe(foeId: string) {
  return {
    foeId,
    bestiaryId: 'goblin-skirmisher',
    difficulty: 'easy' as const,
    tags: ['goblin']
  }
}

function tokenRequest(foeId: string) {
  return {
    foeId,
    prompt: 'small green ambusher',
    settings: { provider: 'local' as const, generativeTokensEnabled: true }
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

async function withCampaignPath(run: (filePath: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'dm-enemy-store-'))
  try {
    await run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
