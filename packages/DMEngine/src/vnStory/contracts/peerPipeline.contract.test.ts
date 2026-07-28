import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import {
  appendNpcMemory,
  clearNpcStore,
  constructNpc,
  queryNpcGroundingContext
} from '@weaver/npc-engine'
import { createCampaign } from '../../persistence/campaignPersistence.js'
import { getActiveCampaignSession } from '../../persistence/campaignSession.js'
import { runVnStoryGeneration } from '../pipeline.js'
import { castSlotCount } from '../skeletons.js'
import { VN_STORY_GENERATION_STAGES, type VnStoryGenerationDeps } from '../types.js'

const roots: string[] = []

beforeEach(() => {
  clearNpcStore()
  clearNpcPlaceholderStore()
})

afterEach(() => {
  getActiveCampaignSession()?.close()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
  clearNpcStore()
  clearNpcPlaceholderStore()
})

describe('DMEngine vnStory peer pipeline contract', () => {
  it('runs the full pipeline through real NarrationEngine + NPCEngine APIs', async () => {
    const root = tempRoot()
    const campaignId = 'vn-peer-pipeline'
    setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])

    const result = await runVnStoryGeneration(
      {
        campaignId,
        dataRoot: join(root, 'data'),
        campaignFilePath: join(root, 'story.sqlite'),
        seed: 'peer-pipeline',
        maxSeedRetries: 1,
        premise: 'A lantern thief steals the last harbor light.',
        mainCharacter: {
          name: 'Ryn Vale',
          personality: 'quiet but stubborn',
          appearance: 'salt-stained coat'
        },
        actCount: 2
      },
      realDeps(2)
    )

    expect(result.stages.map((stage) => stage.stage)).toEqual([...VN_STORY_GENERATION_STAGES])
    expect(result.overview.acts).toHaveLength(2)
    expect(result.npcIds).toHaveLength(castSlotCount(2))
    expect(result.lifecycle).toBe('draft')
    expect(getActiveCampaignSession()).toBeNull()

    for (const npcId of result.npcIds) {
      const context = queryNpcGroundingContext({ npcId })
      expect(context.privateMemories).toHaveLength(1)
      expect(context.privateMemories[0]?.text).toContain(npcId)
    }
  }, 90_000)
})

function realDeps(actCount: number): VnStoryGenerationDeps {
  return {
    narration: { fillAndValidate },
    completer: scriptedCompleter(actCount),
    civilization: { ensureNpcPlaceholders },
    npc: { constructNpc, appendNpcMemory, queryNpcGroundingContext },
    character: { setCampaignRaceRoster },
    campaign: { createCampaign }
  }
}

function scriptedCompleter(actCount: number): TextCompleter {
  const castCount = castSlotCount(actCount)
  return {
    async completeText() {
      return {
        backend: 'contract',
        text: [
          '<<<PREMISE_SUMMARY>>>Harbor lights vanish under a thief moon.<<</PREMISE_SUMMARY>>>',
          ...Array.from({ length: actCount }, (_, index) => {
            const n = index + 1
            return `<<<ACT_${n}>>>Title: Act ${n}\nSummary: Beat ${n}.<<</ACT_${n}>>>`
          }),
          ...Array.from({ length: castCount }, (_, index) => {
            const n = index + 1
            return [
              `<<<CAST_${n}>>>`,
              `Name: Peer Cast ${n}`,
              `Role: ally-${n}`,
              `Bio: Peer bio ${n}.`,
              'Race: human',
              'Alignment: neutral',
              'Temperament: curious',
              `<<</CAST_${n}>>>`
            ].join('\n')
          }),
          '<<<OPENING_BEAT>>>Fog on the dock.<<</OPENING_BEAT>>>',
          '<<<OVERVIEW_PROSE>>>Peer overview prose.<<</OVERVIEW_PROSE>>>',
          '<<<PERSIST_SUMMARY>>>Peer draft ready.<<</PERSIST_SUMMARY>>>'
        ].join('\n')
      }
    }
  }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-vn-peer-'))
  roots.push(root)
  return root
}
