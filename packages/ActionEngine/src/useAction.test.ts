import { describe, expect, it } from 'vitest'
import {
  createKnownActionStore,
  createSeedCatalog,
  createActionLockoutStore,
  getAction,
  validateUse,
  useAction,
  type UseActionDeps,
  type UseActionInput
} from './index.js'

function prepareCaster(characterId = 'caster-1'): UseActionDeps & { characterId: string } {
  const catalog = createSeedCatalog()
  const knownActions = createKnownActionStore(catalog)
  const lockout = createActionLockoutStore()
  knownActions.grantKnownAction(characterId, 'ice_bolt')
  knownActions.grantKnownAction(characterId, 'hamstring_strike')
  return { catalog, knownActions, lockout, characterId }
}

function baseUse(
  overrides: Partial<UseActionInput> & Pick<UseActionInput, 'actionId'>
): UseActionInput {
  return {
    characterId: 'caster-1',
    targetIds: ['target-1'],
    distanceFeet: 10,
    ...overrides
  }
}

describe('validateUse unknown and unknown-to-character ids', () => {
  it('rejects unknown catalog action ids', () => {
    const deps = prepareCaster()
    const result = validateUse(
      { characterId: deps.characterId, actionId: 'invented_blast', distanceFeet: 5 },
      deps
    )
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/unknown/i) })
  })

  it('rejects actions not known to the character', () => {
    const catalog = createSeedCatalog()
    const knownActions = createKnownActionStore(catalog)
    const lockout = createActionLockoutStore()
    const result = validateUse(
      { characterId: 'caster-1', actionId: 'ice_bolt', distanceFeet: 10 },
      { catalog, knownActions, lockout }
    )
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/not known/i) })
  })
})

describe('validateUse range inputs', () => {
  it('accepts a known in-range feet action', () => {
    const deps = prepareCaster()
    const result = validateUse(
      { characterId: deps.characterId, actionId: 'ice_bolt', distanceFeet: 30 },
      deps
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.action.actionId).toBe('ice_bolt')
    }
  })

  it('rejects feet-range actions beyond catalog amount', () => {
    const deps = prepareCaster()
    const result = validateUse(
      { characterId: deps.characterId, actionId: 'ice_bolt', distanceFeet: 31 },
      deps
    )
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/range/i) })
  })
})

describe('validateUse ignores LLM cost/range overrides', () => {
  it('still rejects out-of-range when LLM supplies a larger range', () => {
    const deps = prepareCaster()
    const rejected = validateUse(
      {
        characterId: deps.characterId,
        actionId: 'ice_bolt',
        distanceFeet: 31,
        cost: { actionTurns: 0 },
        range: { kind: 'feet', amount: 100 },
        actionTurns: 0
      },
      deps
    )
    expect(rejected.ok).toBe(false)
  })

  it('uses catalog lockout cost when LLM supplies another cost', () => {
    const deps = prepareCaster()
    const accepted = useAction(
      {
        ...baseUse({ actionId: 'ice_bolt', distanceFeet: 25 }),
        cost: { actionTurns: 99 },
        range: { kind: 'feet', amount: 1 },
        actionTurns: 99
      },
      deps
    )
    expect(accepted.ok).toBe(true)
    if (accepted.ok) {
      expect(accepted.lockout.actionTurns).toBe(
        getAction(deps.catalog.actions, 'ice_bolt')?.cost.actionTurns
      )
    }
  })
})

describe('useAction applies catalog effects', () => {
  it('applies catalog effect payloads to each target', () => {
    const deps = prepareCaster()
    const result = useAction(
      baseUse({ actionId: 'ice_bolt', distanceFeet: 20, targetIds: ['a', 'b'] }),
      deps
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.appliedEffects).toEqual([
      {
        targetId: 'a',
        effectId: 'slow_movement',
        params: { feetPenalty: 10, durationRounds: 1 }
      },
      {
        targetId: 'b',
        effectId: 'slow_movement',
        params: { feetPenalty: 10, durationRounds: 1 }
      }
    ])
  })

  it('yields slow_movement for Ice Bolt and Hamstring Strike', () => {
    const deps = prepareCaster()
    const ice = useAction(baseUse({ actionId: 'ice_bolt', distanceFeet: 15 }), deps)
    deps.lockout.clearLockout(deps.characterId)
    const ham = useAction(
      baseUse({
        actionId: 'hamstring_strike',
        distanceFeet: 5,
        weaponReachFeet: 5
      }),
      deps
    )
    expect(ice.ok && ice.appliedEffects[0]?.effectId).toBe('slow_movement')
    expect(ham.ok && ham.appliedEffects[0]?.effectId).toBe('slow_movement')
  })
})

describe('useAction ignores caller effect magnitude overrides', () => {
  it('does not take effect magnitudes from caller free text', () => {
    const deps = prepareCaster()
    const result = useAction(
      {
        ...baseUse({ actionId: 'ice_bolt', distanceFeet: 10 }),
        effects: [{ effectId: 'slow_movement', params: { feetPenalty: 99, durationRounds: 9 } }],
        effectMagnitudes: { feetPenalty: 99 }
      },
      deps
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.appliedEffects[0]?.params).toEqual({
        feetPenalty: 10,
        durationRounds: 1
      })
    }
  })
})

describe('useAction Action-turn lockout', () => {
  it('applies catalog turn lockout and rejects a second use', () => {
    const deps = prepareCaster()
    const first = useAction(baseUse({ actionId: 'ice_bolt', distanceFeet: 10 }), deps)
    expect(first.ok).toBe(true)
    if (first.ok) {
      expect(first.lockout.actionTurns).toBe(1)
    }
    expect(deps.lockout.getRemainingActionTurns(deps.characterId)).toBe(1)
    const second = useAction(
      baseUse({ actionId: 'hamstring_strike', distanceFeet: 5, weaponReachFeet: 5 }),
      deps
    )
    expect(second).toEqual({ ok: false, reason: expect.stringMatching(/lockout|action turn/i) })
  })

  it('has no mana pool field on successful use results', () => {
    const deps = prepareCaster()
    const result = useAction(baseUse({ actionId: 'ice_bolt', distanceFeet: 10 }), deps)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result).not.toHaveProperty('mana')
      expect(JSON.stringify(result)).not.toMatch(/mana/i)
    }
  })
})

describe('meleeWeapon range uses weapon reach inputs', () => {
  it('compares distance to caller-supplied weapon reach', () => {
    const deps = prepareCaster()
    expect(getAction(deps.catalog.actions, 'hamstring_strike')?.range).toEqual({
      kind: 'meleeWeapon'
    })
    expect(
      validateUse(
        {
          characterId: deps.characterId,
          actionId: 'hamstring_strike',
          distanceFeet: 10,
          weaponReachFeet: 5
        },
        deps
      ).ok
    ).toBe(false)
    expect(
      validateUse(
        {
          characterId: deps.characterId,
          actionId: 'hamstring_strike',
          distanceFeet: 5,
          weaponReachFeet: 5
        },
        deps
      ).ok
    ).toBe(true)
  })

  it('fails closed when meleeWeapon use omits weapon reach', () => {
    const deps = prepareCaster()
    const result = validateUse(
      {
        characterId: deps.characterId,
        actionId: 'hamstring_strike',
        distanceFeet: 5
      },
      deps
    )
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/reach/i) })
  })
})

describe('feet range numeric comparison', () => {
  it('keeps feet-range numeric comparison unchanged', () => {
    const deps = prepareCaster()
    expect(
      validateUse(
        { characterId: deps.characterId, actionId: 'ice_bolt', distanceFeet: 30 },
        deps
      ).ok
    ).toBe(true)
    expect(
      validateUse(
        { characterId: deps.characterId, actionId: 'ice_bolt', distanceFeet: 30.1 },
        deps
      ).ok
    ).toBe(false)
  })
})

describe('flavor tags do not fork use resolution', () => {
  it('accepts spell and classAction paths the same way', () => {
    const deps = prepareCaster()
    expect(
      validateUse(
        { characterId: deps.characterId, actionId: 'ice_bolt', distanceFeet: 10 },
        deps
      ).ok
    ).toBe(true)
    expect(
      validateUse(
        {
          characterId: deps.characterId,
          actionId: 'hamstring_strike',
          distanceFeet: 5,
          weaponReachFeet: 5
        },
        deps
      ).ok
    ).toBe(true)
  })
})
