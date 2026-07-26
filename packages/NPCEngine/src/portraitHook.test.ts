import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcStore, getNpc, requestCompanionPortrait, requestNpcPortrait } from './index.js'
import { seedNpc } from './testHelpers.js'

function resetPortraitStore() {
  clearNpcStore()
}

function trackPortraitCalls(calls: string[]) {
  return {
    generatePortrait: async (request: { subjectId: string }) => {
      calls.push(request.subjectId)
      return { imagePath: `/portraits/${request.subjectId}.png`, provider: 'local', degraded: false }
    }
  }
}

describe('NPC portrait hook', () => {
  beforeEach(resetPortraitStore)

  it('returns immediately and populates an optional portrait asynchronously', async () => {
    seedNpc({ npcId: 'npc-portrait' })
    const calls: string[] = []

    const result = requestNpcPortrait({
      npcId: 'npc-portrait',
      prompt: 'caller accepted portrait prompt',
      settings: { provider: 'local', generativeTokensEnabled: true }
    }, trackPortraitCalls(calls))

    expect(result).toEqual({ queued: true, subjectKind: 'npc', subjectId: 'npc-portrait' })
    expect(getNpc('npc-portrait')?.portrait).toBeUndefined()
    await Promise.resolve()
    expect(calls).toEqual(['npc-portrait'])
    expect(getNpc('npc-portrait')?.portrait?.imagePath).toBe('/portraits/npc-portrait.png')
  })

  it('does not queue generation when campaign generative tokens are disabled', async () => {
    seedNpc({ npcId: 'npc-disabled' })
    const calls: string[] = []

    const result = requestNpcPortrait({
      npcId: 'npc-disabled',
      prompt: 'caller accepted portrait prompt',
      settings: { provider: 'local', generativeTokensEnabled: false }
    }, trackPortraitCalls(calls))

    await Promise.resolve()
    expect(result.queued).toBe(false)
    expect(calls).toEqual([])
    expect(getNpc('npc-disabled')?.portrait).toBeUndefined()
  })

  it('uses the same hook for companion portraits and swallows failures', async () => {
    seedNpc({ npcId: 'companion-1' })

    const result = requestCompanionPortrait({
      companionId: 'companion-1',
      prompt: 'caller accepted companion portrait prompt',
      settings: { provider: 'local', generativeTokensEnabled: true }
    }, {
      generatePortrait: async () => {
        throw new Error('image provider unavailable')
      }
    })

    await Promise.resolve()
    expect(result).toEqual({ queued: true, subjectKind: 'companion', subjectId: 'companion-1' })
    expect(getNpc('companion-1')?.portrait).toBeUndefined()
  })
})
