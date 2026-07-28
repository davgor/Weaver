import { describe, expect, it } from 'vitest'
import type { VnPlayCursor, VnStoryCastMember, VnStoryOverview } from '@weaver/dm-engine'
import { assemblePlaySnapshot, restorePlaySnapshot } from './restorePlaySnapshot.js'

describe('restorePlaySnapshot scene-mode from cursor', () => {
  it('restores a scene-mode snapshot from a cursor, synthesizing scene from beat text', () => {
    const snapshot = restorePlaySnapshot({
      cursor: sceneCursor(),
      overview: overview(),
      cast: cast()
    })
    expect(snapshot.mode).toBe('scene')
    expect(snapshot.beatText).toBe('Fog rolls over the dock.')
    expect(snapshot.options).toEqual(['Search the fog.', 'Ask the warden.'])
    expect(snapshot.speakerId).toBeNull()
    expect(snapshot.phase).toBe('story')
    expect(snapshot.storyComplete).toBe(false)
    expect(snapshot.actIndex).toBe(1)
    expect(snapshot.scene).toEqual([
      expect.objectContaining({ id: 'opening', text: 'Fog rolls over the dock.' })
    ])
    expect(snapshot.placeholders.some((row) => row.slot === 'mc')).toBe(true)
  })
})

describe('restorePlaySnapshot npc-mode with freeplay flags', () => {
  it('restores an npc-mode snapshot with speaker name and freeplay flags', () => {
    const snapshot = restorePlaySnapshot({
      cursor: {
        ...sceneCursor(),
        mode: 'npc',
        speakerId: 'npc-1',
        beatText: 'The warden scowls.',
        phase: 'freeplay',
        storyComplete: true,
        actIndex: 3
      },
      overview: overview(),
      cast: cast()
    })
    expect(snapshot.mode).toBe('npc')
    expect(snapshot.speakerId).toBe('npc-1')
    expect(snapshot.speakerName).toBe('Harbor Warden')
    expect(snapshot.phase).toBe('freeplay')
    expect(snapshot.storyComplete).toBe(true)
    expect(snapshot.actIndex).toBe(3)
    expect(snapshot.placeholders.some((row) => row.slot === 'npc')).toBe(true)
  })
})

describe('restorePlaySnapshot prefers provided projections', () => {
  it('prefers provided scene/social projections over synthesized ones', () => {
    const scene = [{ id: 's-prior', text: 'Prior beat.', at: 1 }]
    const social = [{ id: 'l1', kind: 'npc' as const, speakerId: 'npc-1', text: 'Hi.', at: 1 }]
    const snapshot = restorePlaySnapshot({
      cursor: sceneCursor(),
      overview: overview(),
      cast: cast(),
      scene,
      social
    })
    expect(snapshot.scene).toBe(scene)
    expect(snapshot.social).toBe(social)
  })
})

describe('assemblePlaySnapshot carries phase fields', () => {
  it('builds a snapshot carrying phase/storyComplete/actIndex', () => {
    const snapshot = assemblePlaySnapshot({
      campaignId: 'vn-1',
      characterId: 'vn-1-vn-mc',
      overview: overview(),
      cast: cast(),
      mode: 'scene',
      beatText: 'A beat.',
      speakerId: null,
      options: ['A', 'B'],
      scene: [],
      social: [],
      phase: 'story',
      storyComplete: false,
      actIndex: 2
    })
    expect(snapshot.actIndex).toBe(2)
    expect(snapshot.phase).toBe('story')
    expect(snapshot.speakerName).toBeNull()
  })
})

function sceneCursor(): VnPlayCursor {
  return {
    campaignId: 'vn-1',
    characterId: 'vn-1-vn-mc',
    phase: 'story',
    storyComplete: false,
    actIndex: 1,
    beatId: 'opening',
    mode: 'scene',
    beatText: 'Fog rolls over the dock.',
    speakerId: null,
    options: ['Search the fog.', 'Ask the warden.'],
    updatedAt: '2026-07-27T00:00:00.000Z'
  }
}

function overview(): VnStoryOverview {
  return {
    campaignId: 'vn-1',
    premiseSummary: 'Harbor lights vanish.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    acts: [],
    cast: cast(),
    openingBeat: 'Fog rolls over the dock.',
    overviewProse: 'A short tale.'
  }
}

function cast(): VnStoryCastMember[] {
  return [{ npcId: 'npc-1', displayName: 'Harbor Warden', role: 'mentor' }]
}
