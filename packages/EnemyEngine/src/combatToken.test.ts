import { describe, expect, it } from 'vitest'
import {
  clearEnemyStore,
  generateEncounterFoes,
  getGeneratedFoe,
  requestCombatToken,
  type EnemyPortraitGenerator
} from './index.js'

describe('EnemyEngine combat token hook — disabled generation', () => {
  it('does not queue token generation when campaign settings disable it', () => {
    clearEnemyStore()
    const [foe] = generateEncounterFoes({ difficulty: 'easy' })
    const calls: string[] = []

    const result = requestCombatToken({
      foeId: requireFoeId(foe),
      prompt: 'small green ambusher',
      settings: { provider: 'local', generativeTokensEnabled: false }
    }, {
      generatePortrait: async () => {
        calls.push('called')
        return { imagePath: '/tokens/disabled.png', provider: 'local', degraded: false }
      }
    })

    expect(result).toEqual({ queued: false, foeId: requireFoeId(foe), fromCache: false })
    expect(calls).toEqual([])
  })
})

describe('EnemyEngine combat token hook — async generation', () => {
  it('queues token generation without blocking encounter start', async () => {
    clearEnemyStore()
    const [foe] = generateEncounterFoes({ difficulty: 'easy' })
    const deferred = createDeferredToken()

    const result = requestCombatToken(tokenRequest(requireFoeId(foe)), {
      generatePortrait: deferred.generatePortrait
    })

    expect(result.queued).toBe(true)
    expect(getGeneratedFoe(requireFoeId(foe))?.combatToken).toBeUndefined()

    deferred.resolve('/tokens/goblin.png')
    await flushMicrotasks()

    expect(getGeneratedFoe(requireFoeId(foe))?.combatToken).toEqual({
      imagePath: '/tokens/goblin.png',
      provider: 'local'
    })
  })
})

describe('EnemyEngine combat token hook — token cache', () => {
  it('reuses species and variant token cache across non-unique spawns', async () => {
    clearEnemyStore()
    const [first, second] = generateEncounterFoes({ difficulty: 'easy', count: 2 })
    let calls = 0

    requestCombatToken(tokenRequest(requireFoeId(first)), {
      generatePortrait: async () => {
        calls += 1
        return { imagePath: '/tokens/cached-goblin.png', provider: 'local', degraded: false }
      }
    })
    await flushMicrotasks()
    const result = requestCombatToken(tokenRequest(requireFoeId(second)), {
      generatePortrait: async () => {
        calls += 1
        return { imagePath: '/tokens/second.png', provider: 'local', degraded: false }
      }
    })

    expect(result).toEqual({ queued: false, foeId: requireFoeId(second), fromCache: true })
    expect(calls).toBe(1)
    expect(getGeneratedFoe(requireFoeId(second))?.combatToken?.imagePath).toBe('/tokens/cached-goblin.png')
  })

  it('bypasses the shared cache for visually unique instances', async () => {
    clearEnemyStore()
    const [first, second] = generateEncounterFoes({ difficulty: 'easy', count: 2 })
    let calls = 0

    requestCombatToken({ ...tokenRequest(requireFoeId(first)), visuallyUnique: true }, {
      generatePortrait: async () => {
        calls += 1
        return { imagePath: '/tokens/unique-one.png', provider: 'local', degraded: false }
      }
    })
    await flushMicrotasks()
    requestCombatToken({ ...tokenRequest(requireFoeId(second)), visuallyUnique: true }, {
      generatePortrait: async () => {
        calls += 1
        return { imagePath: '/tokens/unique-two.png', provider: 'local', degraded: false }
      }
    })
    await flushMicrotasks()

    expect(calls).toBe(2)
    expect(getGeneratedFoe(requireFoeId(second))?.combatToken?.imagePath).toBe('/tokens/unique-two.png')
  })
})

describe('EnemyEngine combat token hook — portrait failures', () => {
  it('swallows portrait generation failures without removing the foe', async () => {
    clearEnemyStore()
    const [foe] = generateEncounterFoes({ difficulty: 'easy' })

    expect(() => requestCombatToken(tokenRequest(requireFoeId(foe)), {
      generatePortrait: async () => {
        throw new Error('provider unavailable')
      }
    })).not.toThrow()
    await flushMicrotasks()

    expect(getGeneratedFoe(requireFoeId(foe))?.combatToken).toBeUndefined()
  })
})

function tokenRequest(foeId: string) {
  return {
    foeId,
    prompt: 'encounter token',
    settings: { provider: 'local' as const, generativeTokensEnabled: true }
  }
}

function requireFoeId(foe: { foeId: string } | undefined): string {
  if (foe === undefined) {
    throw new Error('Expected generated foe')
  }
  return foe.foeId
}

function createDeferredToken() {
  let resolveImage: (path: string) => void = () => undefined
  const promise = new Promise<string>((resolve) => {
    resolveImage = resolve
  })
  const generatePortrait: EnemyPortraitGenerator = async () => {
    const imagePath = await promise
    return { imagePath, provider: 'local', degraded: false }
  }
  return { generatePortrait, resolve: resolveImage }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}
