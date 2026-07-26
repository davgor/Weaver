import { describe, expect, it } from 'vitest'
import {
  deityNameFallback,
  resolveDeityName,
  validateDeityName
} from './deityNameValidate.js'

describe('validateDeityName', () => {
  it('accepts plain deity names without hyphenated epithets', () => {
    expect(validateDeityName('Aurora the Dawn')).toEqual({ ok: true, name: 'Aurora the Dawn' })
  })

  it('rejects hyphenated epithet shapes', () => {
    expect(validateDeityName('Storm-Bringer')).toEqual({
      ok: false,
      reason: 'Deity names must not use hyphenated epithets'
    })
    expect(validateDeityName('Haleth Light-of-Dawn')).toEqual({
      ok: false,
      reason: 'Deity names must not use hyphenated epithets'
    })
  })

  it('rejects empty names', () => {
    expect(validateDeityName('   ')).toEqual({
      ok: false,
      reason: 'Deity name is required'
    })
  })
})

describe('resolveDeityName', () => {
  it('falls back to a safe default when validation fails', () => {
    expect(resolveDeityName('Ever-Watching')).toEqual({
      name: deityNameFallback(0),
      fellBack: true,
      reason: 'Deity names must not use hyphenated epithets'
    })
  })

  it('keeps valid names without fallback', () => {
    expect(resolveDeityName('Selene the Pale')).toEqual({
      name: 'Selene the Pale',
      fellBack: false
    })
  })
})
