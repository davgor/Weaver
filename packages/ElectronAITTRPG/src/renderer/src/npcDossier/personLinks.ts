type PersonTextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'person'; text: string; person: PersonLinkTarget }

type PersonLinkTarget = {
  npcId: string
  campaignId: string
  displayName: string
}

type PersonMatch = {
  index: number
  person: PersonLinkTarget
}

export function segmentPersonLinks(
  text: string,
  people: readonly PersonLinkTarget[]
): PersonTextSegment[] {
  const targets = people.filter(hasDisplayName).sort(longestNameFirst)
  if (targets.length === 0 || text.length === 0) return [{ kind: 'text', text }]
  return buildSegments(text, targets)
}

function buildSegments(text: string, targets: PersonLinkTarget[]): PersonTextSegment[] {
  const lowerText = text.toLowerCase()
  const segments: PersonTextSegment[] = []
  let cursor = 0
  while (cursor < text.length) {
    const match = findNextPersonMatch(text, lowerText, cursor, targets)
    if (match === null) return appendRemaining(segments, text, cursor)
    if (match.index > cursor) segments.push({ kind: 'text', text: text.slice(cursor, match.index) })
    const end = match.index + match.person.displayName.length
    segments.push({ kind: 'person', text: text.slice(match.index, end), person: match.person })
    cursor = end
  }
  return segments
}

function findNextPersonMatch(
  text: string,
  lowerText: string,
  cursor: number,
  targets: readonly PersonLinkTarget[]
): PersonMatch | null {
  let best: PersonMatch | null = null
  for (const person of targets) {
    const index = findBoundedName(text, lowerText, cursor, person.displayName)
    if (index >= 0 && (best === null || index < best.index)) best = { index, person }
  }
  return best
}

function findBoundedName(
  text: string,
  lowerText: string,
  cursor: number,
  name: string
): number {
  const lowerName = name.toLowerCase()
  let index = lowerText.indexOf(lowerName, cursor)
  while (index >= 0) {
    if (isNameBounded(text, index, index + name.length)) return index
    index = lowerText.indexOf(lowerName, index + 1)
  }
  return -1
}

function isNameBounded(text: string, start: number, end: number): boolean {
  return !isWordChar(text[start - 1]) && !isWordChar(text[end])
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[A-Za-z0-9]/.test(char)
}

function appendRemaining(
  segments: PersonTextSegment[],
  text: string,
  cursor: number
): PersonTextSegment[] {
  segments.push({ kind: 'text', text: text.slice(cursor) })
  return segments
}

function hasDisplayName(person: PersonLinkTarget): boolean {
  return person.displayName.trim().length > 0
}

function longestNameFirst(left: PersonLinkTarget, right: PersonLinkTarget): number {
  return right.displayName.length - left.displayName.length
}
