import { describe, expect, it } from 'vitest'
import {
  fillAndValidate,
  fillSkeleton,
  parseLabeledBlocks,
  type FillAndValidateInput
} from './skeletonFill.js'
import type { TextCompleter } from './peers.js'

describe('parseLabeledBlocks', () => {
  it('extracts labeled blocks from model output', () => {
    const blocks = parseLabeledBlocks(`
preface ignored
<<<TITLE>>>
The Ember Gate
<<</TITLE>>>
<<<DETAIL>>>
An elf ranger watches the pass.
<<</DETAIL>>>
`)

    expect(blocks).toEqual({
      TITLE: 'The Ember Gate',
      DETAIL: 'An elf ranger watches the pass.'
    })
  })
})

describe('fillSkeleton', () => {
  it('substitutes normal and narration placeholders', () => {
    const filled = fillSkeleton('{{TITLE}} -- {{@DETAIL}} -- {{TITLE}}', {
      TITLE: 'Gate',
      DETAIL: 'mist rising'
    })

    expect(filled).toBe('Gate -- mist rising -- Gate')
  })
})

describe('fillAndValidate', () => {
  it('fills a skeleton when all required blocks respect facts', async () => {
    const input = request({
      skeleton: '{"title":"{{TITLE}}","detail":"{{@DETAIL}}"}',
      facts: { race: 'elf', background: 'outlander' },
      stage: 'campaign-seed',
      seed: 'seed-1'
    })
    const result = await fillAndValidate(
      input,
      scriptedCompleter(`
<<<TITLE>>>
Elf Ranger at the Ember Gate
<<</TITLE>>>
<<<DETAIL>>>
Race: elf. Background: outlander. The ranger studies old tracks.
<<</DETAIL>>>
`)
    )

    expect(result).toEqual({
      ok: true,
      filled: {
        TITLE: 'Elf Ranger at the Ember Gate',
        DETAIL: 'Race: elf. Background: outlander. The ranger studies old tracks.'
      },
      filledText:
        '{"title":"Elf Ranger at the Ember Gate","detail":"Race: elf. Background: outlander. The ranger studies old tracks."}',
      errors: []
    })
  })
})

describe('fillAndValidate rejection', () => {
  it('rejects output missing a required token block', async () => {
    const result = await fillAndValidate(
      request({
        skeleton: '{"title":"{{TITLE}}","detail":"{{DETAIL}}"}',
        facts: {},
        stage: 'campaign-seed'
      }),
      scriptedCompleter(`
<<<TITLE>>>
Only one block
<<</TITLE>>>
`)
    )

    expect(result.ok).toBe(false)
    expect(result.filledText).toBeUndefined()
    expect(result.errors).toContain('Missing block for token DETAIL')
  })

  it('rejects blocks that contradict supplied facts', async () => {
    const result = await fillAndValidate(
      request({
        skeleton: '{"detail":"{{DETAIL}}"}',
        facts: { race: 'elf' },
        stage: 'guided-character'
      }),
      scriptedCompleter(`
<<<DETAIL>>>
Race: dwarf. The warrior enters with a hammer.
<<</DETAIL>>>
`)
    )

    expect(result.ok).toBe(false)
    expect(result.filledText).toBeUndefined()
    expect(result.errors).toContain('Block DETAIL contradicts fact race=elf')
  })
})

function request(input: FillAndValidateInput): FillAndValidateInput {
  return input
}

function scriptedCompleter(text: string): TextCompleter {
  return {
    completeText: async () => ({ text, backend: 'scripted' })
  }
}
