export type NarrativeEmphasis = 'normal' | 'bold' | 'italic'

export type NarrativeSegment = {
  text: string
  emphasis: NarrativeEmphasis
}

const TOKEN_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*)/g

export function parseNarrativeEmphasis(text: string): NarrativeSegment[] {
  return text
    .split(TOKEN_PATTERN)
    .filter((part) => part.length > 0)
    .map(segmentForPart)
}

function segmentForPart(part: string): NarrativeSegment {
  if (part.startsWith('**') && part.endsWith('**')) {
    return { text: part.slice(2, -2), emphasis: 'bold' }
  }
  if (part.startsWith('*') && part.endsWith('*')) {
    return { text: part.slice(1, -1), emphasis: 'italic' }
  }
  return { text: part, emphasis: 'normal' }
}
