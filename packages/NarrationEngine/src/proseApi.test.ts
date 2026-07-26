import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNarrationStore,
  generateScene,
  projectScene,
  projectSocial,
  recordPlayerSocial,
  streamSocial
} from './proseApi.js'
import type { NarrationPeers } from './peers.js'
import type { TextCompletionRequest } from './peers.js'

beforeEach(() => {
  clearNarrationStore()
})

describe('Social vs Scene projections', () => {
  it('keeps player Social lines separate from Scene exposition', async () => {
    recordPlayerSocial({ speakerId: 'pc-1', text: 'I greet the guard.' })
    const peers = peersWithTexts([
      'The courtyard falls quiet.\n<<<CLAIMS\nnpcPresent:npc-guard\n>>>'
    ])

    const scene = await generateScene(
      { prompt: 'Describe the courtyard.', context: 'npcPresent:npc-guard' },
      peers
    )

    expect(scene.status).toBe('persisted')
    expect(projectSocial().map((line) => line.text)).toEqual(['I greet the guard.'])
    expect(projectScene().map((block) => block.text)).toEqual(['The courtyard falls quiet.'])
    expect(projectSocial()[0]?.kind).toBe('player')
  })
})

describe('Social streaming', () => {
  it('streams Social NPC replies incrementally before persisting', async () => {
    const peers = peersWithTexts([
      'Hello, traveler.\n<<<CLAIMS\nnpcPresent:npc-mira\n>>>'
    ])
    const chunks: string[] = []
    const events = []

    for await (const event of streamSocial(dialogueInput('npc-mira'), peers)) {
      events.push(event)
      if (event.type === 'chunk') {
        chunks.push(event.text)
      }
    }

    expect(chunks.join('')).toBe('Hello, traveler.')
    expect(chunks.length).toBeGreaterThan(1)
    expect(events.some((event) => event.type === 'line')).toBe(true)
    expect(projectSocial().map((line) => line.text)).toEqual(['Hello, traveler.'])
    expect(projectScene()).toEqual([])
  })
})

describe('silent Social resolve', () => {
  it('skips Social generation on silent low-stakes turns', async () => {
    const peers = peersWithTexts(['should not be called'])
    const events = []

    for await (const event of streamSocial(silentInput('npc-mira'), peers)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'silent' }])
    expect(projectSocial()).toEqual([])
    expect(peers.calls).toEqual([])
  })
})

describe('claim reject and rewrite', () => {
  it('rejects contradicted claims instead of persisting them', async () => {
    const peers = peersWithTexts([
      'A stranger appears.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>',
      'Still inventing.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>'
    ])

    const outcome = await generateScene({ prompt: 'Narrate arrival.' }, peers)

    expect(outcome.status).toBe('rejected')
    expect(projectScene()).toEqual([])
    expect(peers.calls).toHaveLength(2)
  })

  it('rewrites once when the first draft contradicts peer facts', async () => {
    const peers = peersWithTexts([
      'A stranger appears.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>',
      'The courtyard falls quiet.\n<<<CLAIMS\nnpcPresent:npc-guard\n>>>'
    ])

    const outcome = await generateScene({ prompt: 'Narrate the courtyard.' }, peers)

    expect(outcome).toMatchObject({
      status: 'persisted',
      prose: 'The courtyard falls quiet.'
    })
    expect(projectScene().map((block) => block.text)).toEqual(['The courtyard falls quiet.'])
  })

  it('scrubs trademark terms and rewrites once when tone violations remain', async () => {
    const peers = peersWithTexts([
      'Roll a d20 for initiative order.\n<<<CLAIMS\n>>>',
      'You steady your breath and move on.\n<<<CLAIMS\n>>>'
    ])

    const outcome = await generateScene({ prompt: 'Narrate the hallway.' }, peers)

    expect(outcome).toMatchObject({
      status: 'persisted',
      prose: 'You steady your breath and move on.'
    })
    expect(peers.calls[1]?.prompt).toContain('Tone violation: d20')
  })

  it('persists guarded prose with terminology rewrites applied', async () => {
    const peers = peersWithTexts([
      'The beholder waits in silence.\n<<<CLAIMS\nnpcPresent:npc-guard\n>>>'
    ])

    const outcome = await generateScene({ prompt: 'Narrate the vault.' }, peers)

    expect(outcome).toMatchObject({
      status: 'persisted',
      prose: 'The eye tyrant waits in silence.'
    })
    expect(projectScene().map((block) => block.text)).toEqual(['The eye tyrant waits in silence.'])
  })
})

describe('social stream validation failures', () => {
  it('rejects social output when rewrite cannot fix contradictions', async () => {
    const peers = peersWithTexts([
      'A stranger appears.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>',
      'Still inventing.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>'
    ])
    const events = []

    for await (const event of streamSocial(dialogueInput('npc-mira'), peers)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'rejected', validation: expect.any(Object) }])
    expect(projectSocial()).toEqual([])
  })

  it('rewrites invalid social output once before streaming chunks', async () => {
    const peers = peersWithTexts([
      'A stranger appears.\n<<<CLAIMS\nnpcPresent:npc-missing\n>>>',
      'Mira nods.\n<<<CLAIMS\nnpcPresent:npc-mira\n>>>'
    ])
    const events = []

    for await (const event of streamSocial(dialogueInput('npc-mira'), peers)) {
      events.push(event)
    }

    expect(events.some((event) => event.type === 'line')).toBe(true)
    expect(projectSocial().map((line) => line.text)).toEqual(['Mira nods.'])
  })

  it('streams single-word replies as one chunk', async () => {
    const peers = peersWithTexts(['Hello.\n<<<CLAIMS\nnpcPresent:npc-mira\n>>>'])
    const chunks: string[] = []

    for await (const event of streamSocial(dialogueInput('npc-mira'), peers)) {
      if (event.type === 'chunk' && !event.done) {
        chunks.push(event.text)
      }
    }

    expect(chunks).toEqual(['Hello.'])
  })
})

function dialogueInput(speakerId: string) {
  return {
    prompt: 'Mira replies.',
    speakerId,
    kind: 'npc' as const,
    interest: {
      stakes: 'low' as const,
      hasDialogue: true,
      worldChanged: false,
      combatOccurred: false,
      noteworthyEventCount: 0
    }
  }
}

function silentInput(speakerId: string) {
  return {
    prompt: 'routine wait',
    speakerId,
    kind: 'npc' as const,
    interest: {
      stakes: 'low' as const,
      hasDialogue: false,
      worldChanged: false,
      combatOccurred: false,
      noteworthyEventCount: 0
    }
  }
}

function peersWithTexts(texts: string[]): NarrationPeers & { calls: TextCompletionRequest[] } {
  const queue = [...texts]
  const calls: TextCompletionRequest[] = []
  return {
    calls,
    llm: {
      completeText: async (request) => {
        calls.push(request)
        const text = queue.shift()
        if (text === undefined) {
          throw new Error('Unexpected completeText call')
        }
        return { text, backend: 'cpu' }
      }
    },
    npcs: {
      getNpc: (npcId) => (npcId === 'npc-guard' || npcId === 'npc-mira' ? { npcId } : undefined)
    }
  }
}
