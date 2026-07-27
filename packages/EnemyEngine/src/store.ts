import type { EnemyCombatToken, GeneratedFoeRef } from './types.js'

export type EnemyCampaignStore = {
  saveGeneratedFoe: (foe: GeneratedFoeRef) => GeneratedFoeRef
  getGeneratedFoe: (foeId: string) => GeneratedFoeRef | undefined
  updateGeneratedFoeToken: (foeId: string, token: EnemyCombatToken) => void
  getCachedCombatToken: (cacheKey: string) => EnemyCombatToken | undefined
  setCachedCombatToken: (cacheKey: string, token: EnemyCombatToken) => void
  clearEnemyStore: () => void
  listGeneratedFoes: () => GeneratedFoeRef[]
}

let activeStore: EnemyCampaignStore = createMemoryEnemyCampaignStore()
let campaignBound = false

export function createMemoryEnemyCampaignStore(): EnemyCampaignStore {
  const generatedFoes = new Map<string, GeneratedFoeRef>()
  const tokenCache = new Map<string, EnemyCombatToken>()

  return {
    saveGeneratedFoe(foe) {
      const copy = cloneFoe(foe)
      generatedFoes.set(copy.foeId, copy)
      return cloneFoe(copy)
    },
    getGeneratedFoe(foeId) {
      const foe = generatedFoes.get(foeId)
      return foe === undefined ? undefined : cloneFoe(foe)
    },
    updateGeneratedFoeToken(foeId, token) {
      const foe = generatedFoes.get(foeId)
      if (foe === undefined) {
        throw new Error(`Unknown generated foe id: ${foeId}`)
      }
      generatedFoes.set(foeId, { ...cloneFoe(foe), combatToken: { ...token } })
    },
    getCachedCombatToken(cacheKey) {
      const token = tokenCache.get(cacheKey)
      return token === undefined ? undefined : { ...token }
    },
    setCachedCombatToken(cacheKey, token) {
      tokenCache.set(cacheKey, { ...token })
    },
    clearEnemyStore() {
      generatedFoes.clear()
      tokenCache.clear()
    },
    listGeneratedFoes() {
      return [...generatedFoes.values()].map(cloneFoe)
    }
  }
}

export function saveGeneratedFoe(foe: GeneratedFoeRef): GeneratedFoeRef {
  return activeStore.saveGeneratedFoe(foe)
}

export function getGeneratedFoe(foeId: string): GeneratedFoeRef | undefined {
  return activeStore.getGeneratedFoe(foeId)
}

export function requireGeneratedFoe(foeId: string): GeneratedFoeRef {
  const foe = getGeneratedFoe(foeId)
  if (foe === undefined) {
    throw new Error(`Unknown generated foe id: ${foeId}`)
  }
  return foe
}

export function updateGeneratedFoeToken(foeId: string, token: EnemyCombatToken): void {
  activeStore.updateGeneratedFoeToken(foeId, token)
}

export function getCachedCombatToken(cacheKey: string): EnemyCombatToken | undefined {
  return activeStore.getCachedCombatToken(cacheKey)
}

export function setCachedCombatToken(cacheKey: string, token: EnemyCombatToken): void {
  activeStore.setCachedCombatToken(cacheKey, token)
}

export function clearEnemyStore(): void {
  activeStore.clearEnemyStore()
}

export function listGeneratedFoes(): GeneratedFoeRef[] {
  return activeStore.listGeneratedFoes()
}

export function bindEnemyCampaignStore(store: EnemyCampaignStore): void {
  activeStore = store
  campaignBound = true
}

export function unbindEnemyCampaignStore(): void {
  activeStore = createMemoryEnemyCampaignStore()
  campaignBound = false
}

export function isEnemyCampaignStoreBound(): boolean {
  return campaignBound
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
