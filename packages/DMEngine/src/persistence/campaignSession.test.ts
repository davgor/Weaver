import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCampaignSession,
  getActiveCampaignSession
} from './campaignSession.js'

afterEach(() => {
  getActiveCampaignSession()?.close()
})

function withCampaignPath(filename: string, run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-engine-session-'))
  try {
    run(join(root, filename))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

describe('CampaignSession meta accessors', () => {
  it('round-trips a meta key on the open session', () => {
    withCampaignPath('session-meta.sqlite', (filePath) => {
      const session = createCampaignSession({ campaignId: 'session-meta', filePath })
      session.upsertMeta('vn_play_cursor', '{"beatId":"opening"}')
      expect(session.readMeta('vn_play_cursor')).toBe('{"beatId":"opening"}')
      expect(session.readMeta('missing')).toBeUndefined()

      session.upsertMeta('vn_play_cursor', '{"beatId":"beat-2"}')
      expect(session.readMeta('vn_play_cursor')).toBe('{"beatId":"beat-2"}')
      session.close()
    })
  })
})
