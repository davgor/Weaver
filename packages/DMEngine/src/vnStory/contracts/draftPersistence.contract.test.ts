import { existsSync, mkdtempSync, rmSync } from 'node:fs'
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
import { createCampaign, openCampaign } from '../../persistence/campaignPersistence.js'
import {
  readCampaignMeta,
  readCatalogEntry
} from '../../persistence/campaignMeta.js'
import { getActiveCampaignSession } from '../../persistence/campaignSession.js'
import { runVnStoryGeneration } from '../pipeline.js'
import { permanentizeVnStory } from '../permanentize.js'
import { castSlotCount } from '../skeletons.js'
import type { VnStoryGenerationDeps } from '../types.js'

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

describe('DMEngine vnStory draft persistence contract', () => {
  it('persists draft lifecycle and catalog without opening a play session', async () => {
    const root = tempRoot()
    const campaignId = 'vn-draft-contract'
    setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])
    const filePath = join(root, 'story.sqlite')

    const result = await runVnStoryGeneration(input(campaignId, root, filePath), realDeps(3))

    expect(result.lifecycle).toBe('draft')
    expect(getActiveCampaignSession()).toBeNull()
    expect(existsSync(filePath)).toBe(true)

    const opened = openCampaign({ campaignId, filePath })
    expect(readCampaignMeta(opened, 'lifecycle')).toBe('draft')
    expect(readCampaignMeta(opened, 'kind')).toBe('vn_story')
    expect(readCampaignMeta(opened, 'act_count')).toBe('3')
    expect(readCatalogEntry(opened, 'vn_story', 'brief')?.payloadJson).toContain('lantern thief')
    expect(readCatalogEntry(opened, 'vn_story', 'cast')?.payloadJson).toContain('npcIds')
    expect(readCatalogEntry(opened, 'vn_story', 'overview')?.payloadJson).toContain('openingBeat')
    opened.close()

    const permanent = permanentizeVnStory({ campaignId, filePath })
    expect(permanent.lifecycle).toBe('permanent')
    expect(permanent.session.isStoreBound()).toBe(true)
    permanent.session.close()

    const reopened = openCampaign({ campaignId, filePath })
    expect(readCampaignMeta(reopened, 'lifecycle')).toBe('permanent')
    reopened.close()
  }, 90_000)
})

function input(campaignId: string, root: string, filePath: string) {
  return {
    campaignId,
    dataRoot: join(root, 'data'),
    campaignFilePath: filePath,
    seed: 'draft-contract',
    maxSeedRetries: 1 as const,
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    actCount: 3
  }
}

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
          ...actBlocks(actCount),
          ...castBlocks(castCount),
          '<<<OPENING_BEAT>>>Fog rolls over the dock as the last lantern dies.<<</OPENING_BEAT>>>',
          '<<<OVERVIEW_PROSE>>>A short tale of stolen light and stubborn courage.<<</OVERVIEW_PROSE>>>',
          '<<<PERSIST_SUMMARY>>>Draft VN story catalog ready.<<</PERSIST_SUMMARY>>>'
        ].join('\n')
      }
    }
  }
}

function actBlocks(actCount: number): string[] {
  return Array.from({ length: actCount }, (_, index) => {
    const n = index + 1
    return `<<<ACT_${n}>>>Title: Act ${n} Title\nSummary: Summary for act ${n}.<<</ACT_${n}>>>`
  })
}

function castBlocks(castCount: number): string[] {
  return Array.from({ length: castCount }, (_, index) => {
    const n = index + 1
    return [
      `<<<CAST_${n}>>>`,
      `Name: Cast Member ${n}`,
      `Role: role-${n}`,
      `Bio: Bio for cast member ${n}.`,
      'Race: human',
      'Alignment: neutral',
      'Temperament: curious',
      `<<</CAST_${n}>>>`
    ].join('\n')
  })
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-vn-draft-'))
  roots.push(root)
  return root
}
