import { describe, expect, it } from 'vitest'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'

describe('DMEngine -> NarrationEngine fillAndValidate contract', () => {
  it('accepts labeled blocks for skeleton placeholders and rejects unlabeled text', async () => {
    const skeleton = ['Canon: {{CANON}}', 'Story: {{STORY_PREMISE}}'].join('\n')
    const ok = await fillAndValidate(
      { skeleton, facts: { campaignId: 'contract-campaign' }, stage: 'canon', seed: 'seed' },
      scriptedCompleter('<<<CANON>>>Moon roads are ancient.<<</CANON>>>\n<<<STORY_PREMISE>>>Find the first lantern.<<</STORY_PREMISE>>>')
    )
    const rejected = await fillAndValidate(
      { skeleton, facts: {}, stage: 'canon', seed: 'seed' },
      scriptedCompleter('{"CANON":"raw json is not accepted"}')
    )

    expect(ok).toMatchObject({
      ok: true,
      filled: {
        CANON: 'Moon roads are ancient.',
        STORY_PREMISE: 'Find the first lantern.'
      },
      errors: []
    })
    expect(ok.filledText).toContain('Moon roads')
    expect(rejected.ok).toBe(false)
    expect(rejected.errors).toEqual(expect.arrayContaining([
      'Missing block for token CANON',
      'Missing block for token STORY_PREMISE'
    ]))
  })
})

function scriptedCompleter(text: string): TextCompleter {
  return {
    async completeText() {
      return { text, backend: 'contract' }
    }
  }
}
