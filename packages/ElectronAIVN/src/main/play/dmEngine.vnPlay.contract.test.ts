import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearNarrationStore } from '@weaver/narration-engine'
import { getActiveCampaignSession } from '@weaver/dm-engine'
import { createLiveVnStoryDeps, invokeRunVnStoryGeneration, permanentizeVnStory } from '../story/runVnGeneration.js'
import { createDiskStoryPort, createVnStoryService } from '../story/storyService.js'
import { createLiveVnResolveTurnDeps } from './livePlayDeps.js'
import { createDiskVnPlayCatalog, createVnPlayService } from './playService.js'
import type { TextCompleter } from '@weaver/narration-engine'

const roots: string[] = []

beforeEach(() => {
  clearNarrationStore()
})

afterEach(() => {
  getActiveCampaignSession()?.close()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('ElectronAIVN → DMEngine/NarrationEngine VN play contract', () => {
  it('opens opening beat, generates choices, advances via resolveTurn', async () => {
    const storiesRoot = tempRoot()
    const completer = combinedCompleter()
    const storyPort = createDiskStoryPort(storiesRoot, {
      generate: (input) =>
        invokeRunVnStoryGeneration(input, createLiveVnStoryDeps(completer)),
      permanentize: (options) => permanentizeVnStory(options)
    })
    const story = createVnStoryService(storyPort)
    const review = await story.startGeneration({
      premise: 'A lantern thief steals the last harbor light.',
      mainCharacter: {
        name: 'Ryn Vale',
        personality: 'quiet but stubborn',
        appearance: 'salt-stained coat'
      },
      actCount: 3
    })
    expect(review.status).toBe('ready')
    expect(review.errorMessage).toBeUndefined()
    await story.confirmReview()
    const played = await story.play()

    const play = createVnPlayService({
      catalog: createDiskVnPlayCatalog(storiesRoot),
      completer,
      resolveTurnDeps: createLiveVnResolveTurnDeps(completer)
    })
    const opened = await play.open(played.campaignId)
    expect(opened.mode).toBe('scene')
    expect(opened.beatText.length).toBeGreaterThan(0)
    expect(opened.options).toHaveLength(2)
    expect(opened.placeholders.some((row) => row.slot === 'mc')).toBe(true)
    expect(opened.placeholders.find((row) => row.slot === 'mc')?.label).toMatch(/character/)

    const advanced = await play.submitAction({
      campaignId: played.campaignId,
      text: opened.options[0]
    })
    expect(advanced.mode).toBe('scene')
    expect(advanced.options).toHaveLength(2)
    expect(advanced.beatText.length).toBeGreaterThan(0)
  }, 45_000)
})

function combinedCompleter(): TextCompleter {
  return {
    async completeText(request) {
      return { backend: 'contract', text: completeForPrompt(request) }
    }
  }
}

function completeForPrompt(request: { prompt: string; context?: string }): string {
  const blob = `${request.prompt}\n${request.context ?? ''}`
  if (blob.includes('Classify the player turn')) {
    return '{"intent":"look","route":"narration"}'
  }
  if (blob.includes('vn.choicePair') || blob.includes('{{OPTION_A}}')) {
    return [
      '<<<OPTION_A>>>Search the fog for the thief.<<</OPTION_A>>>',
      '<<<OPTION_B>>>Ask the harbor warden what they saw.<<</OPTION_B>>>'
    ].join('\n')
  }
  if (isStoryFill(blob)) return storyBlocks()
  return 'Mist parts around a stubborn silhouette.\n<<<CLAIMS\n>>>'
}

function isStoryFill(blob: string): boolean {
  return (
    blob.includes('{{PREMISE_SUMMARY}}') ||
    blob.includes('{{ACT_1}}') ||
    blob.includes('{{CAST_1}}') ||
    blob.includes('{{OPENING_BEAT}}') ||
    blob.includes('{{OVERVIEW_PROSE}}') ||
    blob.includes('{{PERSIST_SUMMARY}}')
  )
}

function storyBlocks(): string {
  const actCount = 3
  const castCount = Math.max(2, Math.min(actCount + 1, 5))
  return [
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

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'aivn-vn-play-contract-'))
  roots.push(root)
  return root
}
