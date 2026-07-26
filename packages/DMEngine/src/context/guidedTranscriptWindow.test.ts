import { describe, expect, it } from 'vitest'
import type { GuidedCreationTranscriptEntry } from '../guidedCreation/types.js'
import { windowGuidedTranscript } from './guidedTranscriptWindow.js'

describe('windowGuidedTranscript', () => {
  const entry = (
    phase: GuidedCreationTranscriptEntry['phase'],
    text: string
  ): GuidedCreationTranscriptEntry => ({
    speaker: 'player',
    phase,
    text
  })

  it('keeps the last N transcript entries', () => {
    const entries = [
      entry('who', 'first'),
      entry('why', 'second'),
      entry('where', 'third'),
      entry('what', 'fourth')
    ]

    expect(windowGuidedTranscript(entries, 2)).toEqual([
      entry('where', 'third'),
      entry('what', 'fourth')
    ])
  })

  it('returns all entries when under the window size', () => {
    const entries = [entry('who', 'only')]
    expect(windowGuidedTranscript(entries, 5)).toEqual(entries)
  })

  it('returns empty array when maxEntries is zero', () => {
    const entries = [entry('who', 'only')]
    expect(windowGuidedTranscript(entries, 0)).toEqual([])
  })
})
