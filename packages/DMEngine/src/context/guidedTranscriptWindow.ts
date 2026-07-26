import type { GuidedCreationTranscriptEntry } from '../guidedCreation/types.js'

export function windowGuidedTranscript(
  entries: GuidedCreationTranscriptEntry[],
  maxEntries: number
): GuidedCreationTranscriptEntry[] {
  if (maxEntries <= 0) {
    return []
  }
  if (entries.length <= maxEntries) {
    return [...entries]
  }
  return entries.slice(-maxEntries)
}
