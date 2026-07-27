import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getActiveCampaignSession } from '@weaver/dm-engine'
import { createLiveVnStoryDeps, invokeRunVnStoryGeneration, permanentizeVnStory } from './runVnGeneration.js'
import { createDiskStoryPort, createVnStoryService } from './storyService.js'
import { listPermanentVnStories } from './storyDisk.js'
import type { TextCompleter } from '@weaver/narration-engine'

const roots: string[] = []

afterEach(() => {
  getActiveCampaignSession()?.close()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('ElectronAIVN → DMEngine VN story contract', () => {
  it('create draft → review payload → permanentize → list', async () => {
    const storiesRoot = tempRoot()
    const completer = scriptedCompleter(3)
    const deps = createLiveVnStoryDeps(completer)
    const port = createDiskStoryPort(storiesRoot, {
      generate: (input) => invokeRunVnStoryGeneration(input, deps),
      permanentize: (options) => permanentizeVnStory(options)
    })
    const service = createVnStoryService(port)

    const review = await service.startGeneration({
      premise: 'A lantern thief steals the last harbor light.',
      mainCharacter: {
        name: 'Ryn Vale',
        personality: 'quiet but stubborn',
        appearance: 'salt-stained coat'
      },
      actCount: 3
    })
    expect(review.status).toBe('ready')
    expect(review.confirmed).toBe(false)
    expect(review.acts).toHaveLength(3)
    expect(review.premiseSummary.length).toBeGreaterThan(0)

    await service.confirmReview()
    const played = await service.play()
    expect(played.lifecycle).toBe('permanent')

    const listed = await service.listSavedGames()
    expect(listed).toEqual([
      expect.objectContaining({
        campaignId: played.campaignId,
        lifecycle: 'permanent',
        title: 'Ryn Vale'
      })
    ])
    expect(listPermanentVnStories(storiesRoot)).toHaveLength(1)
  }, 30_000)
})

function scriptedCompleter(actCount: number): TextCompleter {
  const castCount = Math.max(2, Math.min(actCount + 1, 5))
  return {
    async completeText() {
      return {
        backend: 'contract',
        text: [
          '<<<PREMISE_SUMMARY>>>Harbor lights vanish under a thief moon.<<</PREMISE_SUMMARY>>>',
          ...Array.from({ length: actCount }, (_, i) => {
            const n = i + 1
            return `<<<ACT_${n}>>>Title: Act ${n}\nSummary: Summary ${n}.<<</ACT_${n}>>>`
          }),
          ...Array.from({ length: castCount }, (_, i) => {
            const n = i + 1
            return [
              `<<<CAST_${n}>>>`,
              `Name: Cast Member ${n}`,
              `Role: role-${n}`,
              `Bio: Bio ${n}.`,
              'Race: human',
              'Alignment: neutral',
              'Temperament: curious',
              `<<</CAST_${n}>>>`
            ].join('\n')
          }),
          '<<<OPENING_BEAT>>>Fog rolls over the dock.<<</OPENING_BEAT>>>',
          '<<<OVERVIEW_PROSE>>>A short tale of stolen light.<<</OVERVIEW_PROSE>>>',
          '<<<PERSIST_SUMMARY>>>Draft ready.<<</PERSIST_SUMMARY>>>'
        ].join('\n')
      }
    }
  }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'aivn-vn-story-contract-'))
  roots.push(root)
  return root
}
