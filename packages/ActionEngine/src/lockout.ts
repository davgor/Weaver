export type ActionLockoutStore = {
  getRemainingActionTurns: (characterId: string) => number
  applyLockout: (characterId: string, actionTurns: number) => void
  clearLockout: (characterId: string) => void
  tickLockout: (characterId: string) => void
}

export function createActionLockoutStore(): ActionLockoutStore {
  const remainingByCharacter = new Map<string, number>()

  return {
    getRemainingActionTurns(characterId) {
      assertCharacterId(characterId)
      return remainingByCharacter.get(characterId) ?? 0
    },
    applyLockout(characterId, actionTurns) {
      assertCharacterId(characterId)
      assertPositiveInteger(actionTurns, 'actionTurns')
      remainingByCharacter.set(characterId, actionTurns)
    },
    clearLockout(characterId) {
      assertCharacterId(characterId)
      remainingByCharacter.delete(characterId)
    },
    tickLockout(characterId) {
      assertCharacterId(characterId)
      const remaining = remainingByCharacter.get(characterId) ?? 0
      if (remaining <= 1) {
        remainingByCharacter.delete(characterId)
        return
      }
      remainingByCharacter.set(characterId, remaining - 1)
    }
  }
}

function assertCharacterId(characterId: string): void {
  if (typeof characterId !== 'string' || characterId.trim().length === 0) {
    throw new Error('Expected a non-empty characterId')
  }
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Expected positive integer ${label}`)
  }
}
