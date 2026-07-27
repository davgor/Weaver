import {
  appendSceneBlock,
  appendSocialLine,
  projectScene,
  projectSocial,
  unbindNarrationCampaignStore
} from '@weaver/narration-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaignSession, openCampaignSession } from '../campaignSession.js'

describe('narration campaign store contract', () => {
  afterEach(() => {
    unbindNarrationCampaignStore()
  })

  it('round-trips social and scene projections for a campaign through SQLite reopen', () => {
    withCampaignPath((filePath) => {
      const created = createCampaignSession({ campaignId: 'narration-camp', filePath })
      const line = appendSocialLine({
        kind: 'npc',
        speakerId: 'npc-mira',
        text: 'The road is clear.',
        at: 100
      })
      const block = appendSceneBlock({ text: 'Moonlight crosses the bridge.', at: 101 })
      created.close()

      unbindNarrationCampaignStore()
      expect(projectSocial()).toEqual([])
      expect(projectScene()).toEqual([])

      const opened = openCampaignSession({ campaignId: 'narration-camp', filePath })
      expect(projectSocial()).toEqual([line])
      expect(projectScene()).toEqual([block])
      opened.close()
    })
  })
})

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-narration-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
