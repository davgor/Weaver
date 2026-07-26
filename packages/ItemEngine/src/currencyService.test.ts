import { describe, expect, it } from 'vitest'
import {
  InsufficientFundsError,
  InvalidCurrencyAmountError,
  clampProposedPrice,
  createCurrencyService
} from './currencyService.js'

describe('currency service', () => {
  it('tracks one balance per character', () => {
    const service = createCurrencyService()

    expect(service.getBalance('character.a')).toBe(0)
    expect(service.credit('character.a', 25).balance).toBe(25)
    expect(service.debit('character.a', 5).balance).toBe(20)
    expect(service.getBalance('character.b')).toBe(0)
  })

  it('rejects negative credits and debits with typed errors', () => {
    const service = createCurrencyService()

    expect(() => service.credit('character.a', -1)).toThrow(InvalidCurrencyAmountError)
    expect(() => service.debit('character.a', -1)).toThrow(InvalidCurrencyAmountError)
  })

  it('rejects insufficient funds instead of clamping debits', () => {
    const service = createCurrencyService()
    service.credit('character.a', 3)

    expect(clampProposedPrice(-50)).toBe(1)
    expect(clampProposedPrice(50_000)).toBe(10_000)
    expect(() => service.debit('character.a', 4)).toThrow(InsufficientFundsError)
    expect(service.getBalance('character.a')).toBe(3)
  })

  it('supports configurable price clamp bounds', () => {
    expect(clampProposedPrice(0, { min: 5, max: 50 })).toBe(5)
    expect(clampProposedPrice(500, { min: 5, max: 50 })).toBe(50)
    expect(clampProposedPrice(25, { min: 5, max: 50 })).toBe(25)
  })
})
