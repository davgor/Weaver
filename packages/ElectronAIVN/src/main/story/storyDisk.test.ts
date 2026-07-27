import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import {
  createCampaign,
  permanentizeVnStory,
  runVnStoryGeneration
} from '@weaver/dm-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import {
  appendNpcMemory,
  clearNpcStore,
  constructNpc,
  queryNpcGroundingContext
} from '@weaver/npc-engine'
import {
  ensureStoryLayout,
  listPermanentVnStories,
  resolveStoryPaths
} from './storyDisk.js'

const roots: string[] = []

afterEach(() => {
  clearNpcStore()
  clearNpcPlaceholderStore()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('storyDisk', () => {
  it('resolves story paths and lists only permanent vn_story campaigns', async () => {
    const storiesRoot = tempRoot()
    const draftId = 'vn-draft'
    const permanentId = 'vn-permanent'
    await createDraft(storiesRoot, draftId)
    await createDraft(storiesRoot, permanentId)
    const permanentPaths = resolveStoryPaths(storiesRoot, permanentId)
    const permanent = permanentizeVnStory({
      campaignId: permanentId,
      filePath: permanentPaths.campaignFilePath
    })
    permanent.session.close()

    const listed = listPermanentVnStories(storiesRoot)
    expect(listed).toHaveLength(1)
    expect(listed[0]).toMatchObject({
      campaignId: permanentId,
      lifecycle: 'permanent',
      title: 'Ryn Vale'
    })
    expect(listed.some((row) => row.campaignId === draftId)).toBe(false)
  }, 30_000)
})

async function createDraft(storiesRoot: string, campaignId: string): Promise<void> {
  ensureStoryLayout(storiesRoot, campaignId)
  const paths = resolveStoryPaths(storiesRoot, campaignId)
  setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])
  clearNpcStore()
  clearNpcPlaceholderStore()
  await runVnStoryGeneration(
    {
      campaignId,
      dataRoot: paths.dataRoot,
      campaignFilePath: paths.campaignFilePath,
      seed: `disk-${campaignId}`,
      maxSeedRetries: 1,
      premise: 'A lantern thief steals the last harbor light.',
      mainCharacter: {
        name: 'Ryn Vale',
        personality: 'quiet but stubborn',
        appearance: 'salt-stained coat'
      },
      actCount: 3
    },
    {
      narration: { fillAndValidate },
      completer: scriptedCompleter(),
      civilization: { ensureNpcPlaceholders },
      npc: { constructNpc, appendNpcMemory, queryNpcGroundingContext },
      character: { setCampaignRaceRoster },
      campaign: { createCampaign }
    }
  )
}

function scriptedCompleter(): TextCompleter {
  const actCount = 3
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
  const root = mkdtempSync(join(tmpdir(), 'aivn-story-disk-'))
  roots.push(root)
  return root
}
