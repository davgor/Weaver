import { describe, expect, it } from 'vitest'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'

describe('DMEngine vnStory -> NarrationEngine fillAndValidate contract', () => {
  it('accepts labeled VN stage blocks and rejects unlabeled text', async () => {
    const skeleton = [
      'Premise: {{PREMISE_SUMMARY}}',
      'Opening: {{OPENING_BEAT}}'
    ].join('\n')
    const ok = await fillAndValidate(
      {
        skeleton,
        facts: { campaignId: 'vn-contract' },
        stage: 'premise',
        seed: 'seed'
      },
      scriptedCompleter([
        '<<<PREMISE_SUMMARY>>>Harbor lights vanish.<<</PREMISE_SUMMARY>>>',
        '<<<OPENING_BEAT>>>Fog on the dock.<<</OPENING_BEAT>>>'
      ].join('\n'))
    )
    const rejected = await fillAndValidate(
      { skeleton, facts: {}, stage: 'premise', seed: 'seed' },
      scriptedCompleter('{"PREMISE_SUMMARY":"raw json"}')
    )

    expect(ok).toMatchObject({
      ok: true,
      filled: {
        PREMISE_SUMMARY: 'Harbor lights vanish.',
        OPENING_BEAT: 'Fog on the dock.'
      },
      errors: []
    })
    expect(rejected.ok).toBe(false)
    expect(rejected.errors).toEqual(expect.arrayContaining([
      'Missing block for token PREMISE_SUMMARY',
      'Missing block for token OPENING_BEAT'
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
