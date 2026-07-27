import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCampaign, openCampaign } from '../persistence/campaignPersistence.js'
import { readCampaignMeta } from '../persistence/campaignMeta.js'
import {
  VN_PLAY_CURSOR_META_KEY,
  VN_PLAY_PHASE_META_KEY,
  VN_STORY_COMPLETE_META_KEY,
  parseVnPlayCursor,
  readVnPlayCursor,
  readVnPlayCursorOnSession,
  serializeVnPlayCursor,
  writeVnPlayCursor,
  writeVnPlayCursorOnSession,
  type VnPlayCursor
} from './playCursor.js'

function sampleCursor(overrides: Partial<VnPlayCursor> = {}): VnPlayCursor {
  return {
    campaignId: 'camp-1',
    characterId: 'char-1',
    phase: 'story',
    storyComplete: false,
    actIndex: 1,
    beatId: 'opening',
    mode: 'scene',
    beatText: 'Rain hammers the shuttered inn.',
    speakerId: null,
    options: ['Wait it out.', 'Head into the storm.'],
    updatedAt: '2026-07-27T12:00:00.000Z',
    ...overrides
  }
}

function fakeMetaSession(): {
  upsertMeta: (key: string, value: string) => void
  readMeta: (key: string) => string | undefined
  store: Map<string, string>
} {
  const store = new Map<string, string>()
  return {
    store,
    upsertMeta: (key, value) => {
      store.set(key, value)
    },
    readMeta: (key) => store.get(key)
  }
}

function withCampaignPath(filename: string, run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-engine-vn-cursor-'))
  try {
    run(join(root, filename))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

describe('serializeVnPlayCursor / parseVnPlayCursor', () => {
  it('round-trips a cursor through JSON', () => {
    const cursor = sampleCursor()
    const parsed = parseVnPlayCursor(serializeVnPlayCursor(cursor))
    expect(parsed).toEqual(cursor)
  })

  it('preserves freeplay + storyComplete + non-null speaker', () => {
    const cursor = sampleCursor({
      phase: 'freeplay',
      storyComplete: true,
      actIndex: 3,
      mode: 'npc',
      speakerId: 'npc-warden'
    })
    expect(parseVnPlayCursor(serializeVnPlayCursor(cursor))).toEqual(cursor)
  })

  it('throws on malformed JSON', () => {
    expect(() => parseVnPlayCursor('not json')).toThrow()
  })

  it('throws when a required field is missing', () => {
    const { beatId: _dropped, ...rest } = sampleCursor()
    expect(() => parseVnPlayCursor(JSON.stringify(rest))).toThrow()
  })

  it('throws when phase is not a known value', () => {
    const bad = { ...sampleCursor(), phase: 'sandbox' }
    expect(() => parseVnPlayCursor(JSON.stringify(bad))).toThrow()
  })

  it('throws when options is not a two-string tuple', () => {
    const bad = { ...sampleCursor(), options: ['only one'] }
    expect(() => parseVnPlayCursor(JSON.stringify(bad))).toThrow()
  })
})

describe('writeVnPlayCursor / readVnPlayCursor (handle)', () => {
  it('persists the cursor and survives close/reopen', () => {
    withCampaignPath('cursor.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'camp-1', filePath })
      const cursor = sampleCursor()
      writeVnPlayCursor(created, cursor)
      created.close()

      const opened = openCampaign({ campaignId: 'camp-1', filePath })
      expect(readVnPlayCursor(opened)).toEqual(cursor)
      opened.close()
    })
  })

  it('denormalizes story_complete and play_phase meta keys', () => {
    withCampaignPath('cursor-denorm.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'camp-1', filePath })
      writeVnPlayCursor(
        created,
        sampleCursor({ phase: 'freeplay', storyComplete: true })
      )
      expect(readCampaignMeta(created, VN_STORY_COMPLETE_META_KEY)).toBe('true')
      expect(readCampaignMeta(created, VN_PLAY_PHASE_META_KEY)).toBe('freeplay')
      created.close()
    })
  })

  it('writes false/story denormalized keys for an in-progress story', () => {
    withCampaignPath('cursor-inprogress.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'camp-1', filePath })
      writeVnPlayCursor(created, sampleCursor())
      expect(readCampaignMeta(created, VN_STORY_COMPLETE_META_KEY)).toBe('false')
      expect(readCampaignMeta(created, VN_PLAY_PHASE_META_KEY)).toBe('story')
      created.close()
    })
  })

  it('returns undefined when no cursor has been written', () => {
    withCampaignPath('cursor-empty.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'camp-1', filePath })
      expect(readVnPlayCursor(created)).toBeUndefined()
      created.close()
    })
  })
})

describe('writeVnPlayCursorOnSession / readVnPlayCursorOnSession', () => {
  it('round-trips through a session meta shim', () => {
    const session = fakeMetaSession()
    const cursor = sampleCursor({ mode: 'npc', speakerId: 'npc-1' })
    writeVnPlayCursorOnSession(session, cursor)
    expect(readVnPlayCursorOnSession(session)).toEqual(cursor)
  })

  it('sets denormalized keys on the session too', () => {
    const session = fakeMetaSession()
    writeVnPlayCursorOnSession(
      session,
      sampleCursor({ phase: 'freeplay', storyComplete: true })
    )
    expect(session.store.get(VN_STORY_COMPLETE_META_KEY)).toBe('true')
    expect(session.store.get(VN_PLAY_PHASE_META_KEY)).toBe('freeplay')
    expect(session.store.has(VN_PLAY_CURSOR_META_KEY)).toBe(true)
  })

  it('returns undefined when the session has no cursor', () => {
    expect(readVnPlayCursorOnSession(fakeMetaSession())).toBeUndefined()
  })
})
