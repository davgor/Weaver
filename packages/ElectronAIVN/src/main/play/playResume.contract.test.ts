import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearNarrationStore } from '@weaver/narration-engine'
import { getActiveCampaignSession } from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import {
  createLiveVnStoryDeps,
  invokeRunVnStoryGeneration,
  permanentizeVnStory
} from '../story/runVnGeneration.js'
import { createDiskStoryPort, createVnStoryService } from '../story/storyService.js'
import { createLiveVnResolveTurnDeps } from './livePlayDeps.js'
import { createDiskVnPlayCatalog, createVnPlayService, type VnPlayService } from './playService.js'

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

describe('ElectronAIVN VN play persistence + resume contract', () => {
  it('restores the pending beat, options, mode and speaker after a restart', async () => {
    const storiesRoot = tempRoot()
    const completer = combinedCompleter(3)
    const campaignId = await permanentizeStory(storiesRoot, completer, 3)

    const first = newPlayService(storiesRoot, completer)
    await first.open(campaignId)
    const advanced = await first.submitAction({ campaignId, text: 'Look for the thief.' })
    expect(advanced.options).toHaveLength(2)

    getActiveCampaignSession()?.close()

    const resumed = newPlayService(storiesRoot, completer)
    const reopened = await resumed.open(campaignId)
    expect(reopened.beatText).toBe(advanced.beatText)
    expect(reopened.options).toEqual(advanced.options)
    expect(reopened.mode).toBe(advanced.mode)
    expect(reopened.speakerId).toBe(advanced.speakerId)
    expect(reopened.phase).toBe(advanced.phase)
    expect(reopened.actIndex).toBe(advanced.actIndex)
  }, 45_000)

  it('completes the story after enough turns and resumes into freeplay', async () => {
    const storiesRoot = tempRoot()
    const completer = combinedCompleter(1)
    const campaignId = await permanentizeStory(storiesRoot, completer, 1)

    const play = newPlayService(storiesRoot, completer)
    await play.open(campaignId)
    await play.submitAction({ campaignId, text: 'First move.' })
    const completed = await play.submitAction({ campaignId, text: 'Second move.' })
    expect(completed.storyComplete).toBe(true)
    expect(completed.phase).toBe('freeplay')

    getActiveCampaignSession()?.close()

    const resumed = newPlayService(storiesRoot, completer)
    const reopened = await resumed.open(campaignId)
    expect(reopened.storyComplete).toBe(true)
    expect(reopened.phase).toBe('freeplay')

    const afterFreeplay = await resumed.submitAction({ campaignId, text: 'Keep exploring.' })
    expect(afterFreeplay.storyComplete).toBe(true)
    expect(afterFreeplay.phase).toBe('freeplay')
    expect(afterFreeplay.options).toHaveLength(2)
  }, 45_000)
})

async function permanentizeStory(
  storiesRoot: string,
  completer: TextCompleter,
  actCount: number
): Promise<string> {
  const storyPort = createDiskStoryPort(storiesRoot, {
    generate: (input) => invokeRunVnStoryGeneration(input, createLiveVnStoryDeps(completer)),
    permanentize: (options) => permanentizeVnStory(options)
  })
  const story = createVnStoryService(storyPort)
  await story.startGeneration({
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    actCount
  })
  await story.confirmReview()
  const played = await story.play()
  return played.campaignId
}

function newPlayService(storiesRoot: string, completer: TextCompleter): VnPlayService {
  return createVnPlayService({
    catalog: createDiskVnPlayCatalog(storiesRoot),
    completer,
    resolveTurnDeps: createLiveVnResolveTurnDeps(completer)
  })
}

function combinedCompleter(actCount: number): TextCompleter {
  return {
    async completeText(request) {
      return { backend: 'contract', text: completeForPrompt(request, actCount) }
    }
  }
}

function completeForPrompt(request: { prompt: string; context?: string }, actCount: number): string {
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
  if (isStoryFill(blob)) return storyBlocks(actCount)
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

function storyBlocks(actCount: number): string {
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
  const root = mkdtempSync(join(tmpdir(), 'aivn-vn-resume-contract-'))
  roots.push(root)
  return root
}
