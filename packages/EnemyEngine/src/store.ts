import type { EnemyCombatToken, GeneratedFoeRef } from './types.js'

const generatedFoes = new Map<string, GeneratedFoeRef>()
const tokenCache = new Map<string, EnemyCombatToken>()

export function saveGeneratedFoe(foe: GeneratedFoeRef): GeneratedFoeRef {
  const copy = cloneFoe(foe)
  generatedFoes.set(copy.foeId, copy)
  return cloneFoe(copy)
}

export function getGeneratedFoe(foeId: string): GeneratedFoeRef | undefined {
  const foe = generatedFoes.get(foeId)
  return foe === undefined ? undefined : cloneFoe(foe)
}

export function requireGeneratedFoe(foeId: string): GeneratedFoeRef {
  const foe = getGeneratedFoe(foeId)
  if (foe === undefined) {
    throw new Error(`Unknown generated foe id: ${foeId}`)
  }
  return foe
}

export function updateGeneratedFoeToken(foeId: string, token: EnemyCombatToken): void {
  const foe = requireGeneratedFoe(foeId)
  generatedFoes.set(foeId, { ...foe, combatToken: { ...token } })
}

export function getCachedCombatToken(cacheKey: string): EnemyCombatToken | undefined {
  const token = tokenCache.get(cacheKey)
  return token === undefined ? undefined : { ...token }
}

export function setCachedCombatToken(cacheKey: string, token: EnemyCombatToken): void {
  tokenCache.set(cacheKey, { ...token })
}

export function clearEnemyStore(): void {
  generatedFoes.clear()
  tokenCache.clear()
}

function cloneFoe(foe: GeneratedFoeRef): GeneratedFoeRef {
  const copy = {
    foeId: foe.foeId,
    bestiaryId: foe.bestiaryId,
    difficulty: foe.difficulty,
    tags: [...foe.tags]
  }
  return {
    ...copy,
    ...(foe.regionId === undefined ? {} : { regionId: foe.regionId }),
    ...(foe.combatToken === undefined ? {} : { combatToken: { ...foe.combatToken } })
  }
}
