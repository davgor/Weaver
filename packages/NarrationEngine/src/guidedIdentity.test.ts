import { describe, expect, it } from 'vitest'
import { generateGuidedIdentityReply, type GuidedIdentityInput } from './guidedIdentity.js'
import type { TextCompleter } from './peers.js'

describe('generateGuidedIdentityReply', () => {
  it('returns prose that mentions required identity facts', async () => {
    const result = await generateGuidedIdentityReply(
      input({
        phase: 'who',
        transcript: ['Guide: Who are you?'],
        characterFacts: {
          race: 'elf',
          background: 'outlander',
          archetype: 'ranger'
        }
      }),
      scriptedCompleter(`
<<<REPLY>>>
I am an elf ranger, shaped by an outlander life beyond the old roads.
<<</REPLY>>>
`)
    )

    expect(result).toEqual({
      ok: true,
      prose: 'I am an elf ranger, shaped by an outlander life beyond the old roads.',
      errors: []
    })
  })
})

describe('generateGuidedIdentityReply rejection', () => {
  it('rejects replies that omit race, background, or archetype facts', async () => {
    const result = await generateGuidedIdentityReply(
      input({
        phase: 'why',
        transcript: ['Guide: Why do you travel?'],
        characterFacts: {
          race: 'elf',
          background: 'outlander',
          archetype: 'ranger'
        }
      }),
      scriptedCompleter(`
<<<REPLY>>>
I travel because the horizon keeps calling.
<<</REPLY>>>
`)
    )

    expect(result.ok).toBe(false)
    expect(result.prose).toBeUndefined()
    expect(result.errors).toEqual([
      'Reply must mention race=elf',
      'Reply must mention background=outlander',
      'Reply must mention archetype=ranger'
    ])
  })

  it('rejects invented conflicting mechanical stats', async () => {
    const result = await generateGuidedIdentityReply(
      input({
        phase: 'what',
        transcript: ['Guide: What can you do?'],
        characterFacts: {
          race: 'elf',
          background: 'outlander',
          archetype: 'ranger',
          body: '8'
        }
      }),
      scriptedCompleter(`
<<<REPLY>>>
As an elf outlander ranger, I rely on Body 16 to smash locked doors.
<<</REPLY>>>
`)
    )

    expect(result.ok).toBe(false)
    expect(result.prose).toBeUndefined()
    expect(result.errors).toContain('Reply contradicts mechanical fact body=8')
  })
})

function input(request: GuidedIdentityInput): GuidedIdentityInput {
  return request
}

function scriptedCompleter(text: string): TextCompleter {
  return {
    completeText: async () => ({ text, backend: 'scripted' })
  }
}
