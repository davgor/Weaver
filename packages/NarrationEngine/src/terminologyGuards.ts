import { TERMINOLOGY_REPLACEMENTS } from './terminologyMap.js'

export type TerminologyRewrite = {
  from: string
  to: string
}

export type TerminologyGuardResult = {
  text: string
  rewrites: TerminologyRewrite[]
}

const FORBIDDEN_JARGON = [
  { label: 'd20', pattern: /\bd20\b/gi },
  { label: 'initiative order', pattern: /\binitiative\s+order\b/gi },
  { label: 'saving throw', pattern: /\bsaving\s+throws?\b/gi },
  { label: 'proficiency bonus', pattern: /\bproficiency\s+bonus\b/gi }
] as const

export function applyTerminologyGuards(text: string): TerminologyGuardResult {
  const rewrites: TerminologyRewrite[] = []
  let guarded = text

  for (const entry of TERMINOLOGY_REPLACEMENTS) {
    guarded = guarded.replace(entry.pattern, (match) => {
      const replacement = preserveCase(match, entry.replacement)
      rewrites.push({ from: match, to: replacement })
      return replacement
    })
  }

  return { text: guarded, rewrites }
}

export function findForbiddenTerminology(text: string): string[] {
  const found = new Set<string>()

  for (const entry of TERMINOLOGY_REPLACEMENTS) {
    scanPattern(text, entry.pattern, entry.label, found)
  }
  for (const entry of FORBIDDEN_JARGON) {
    scanPattern(text, entry.pattern, entry.label, found)
  }

  return [...found]
}

function scanPattern(
  text: string,
  pattern: RegExp,
  label: string,
  found: Set<string>
): void {
  const matcher = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  for (const match of text.matchAll(matcher)) {
    if (match[0].length > 0) {
      found.add(label)
    }
  }
}

function preserveCase(source: string, replacement: string): string {
  const first = source[0]
  if (first !== undefined && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement[0]?.toUpperCase() + replacement.slice(1)
  }
  return replacement
}
