import type { FactualClaim } from './proseTypes.js'

const CLAIM_BLOCK = /<<<CLAIMS\s*([\s\S]*?)>>>/i

export function extractClaims(raw: string): FactualClaim[] {
  const match = CLAIM_BLOCK.exec(raw)
  if (match === null) {
    return []
  }
  return parseClaimLines(match[1] ?? '')
}

export function stripClaimBlock(raw: string): string {
  return raw.replace(CLAIM_BLOCK, '').trim()
}

function parseClaimLines(block: string): FactualClaim[] {
  return block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseClaimLine)
    .filter(isClaim)
}

function parseClaimLine(line: string): FactualClaim | null {
  const npc = readPrefixed(line, 'npcPresent:')
  if (npc !== null) {
    return { kind: 'npcPresent', npcId: npc }
  }
  const item = readPrefixed(line, 'itemExists:')
  if (item !== null) {
    return { kind: 'itemExists', itemId: item }
  }
  const location = readPrefixed(line, 'locationName:')
  if (location !== null) {
    return { kind: 'locationName', name: location }
  }
  return null
}

function readPrefixed(line: string, prefix: string): string | null {
  if (!line.startsWith(prefix)) {
    return null
  }
  const value = line.slice(prefix.length).trim()
  return value.length > 0 ? value : null
}

function isClaim(value: FactualClaim | null): value is FactualClaim {
  return value !== null
}
