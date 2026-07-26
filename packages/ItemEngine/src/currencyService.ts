export const DEFAULT_PRICE_CLAMP_MIN = 1
export const DEFAULT_PRICE_CLAMP_MAX = 10_000

export type CurrencyErrorCode =
  | 'ITEM_ENGINE_INVALID_CURRENCY_AMOUNT'
  | 'ITEM_ENGINE_INSUFFICIENT_FUNDS'
  | 'ITEM_ENGINE_INVALID_PRICE_BOUNDS'

export type CurrencyBalanceSnapshot = {
  characterId: string
  balance: number
}

export type PriceClampOptions = {
  min?: number
  max?: number
}

export type CurrencyService = {
  credit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  debit: (characterId: string, amount: number) => CurrencyBalanceSnapshot
  getBalance: (characterId: string) => number
}

export class CurrencyError extends Error {
  readonly code: CurrencyErrorCode

  constructor(code: CurrencyErrorCode, message: string) {
    super(message)
    this.name = new.target.name
    this.code = code
  }
}

export class InvalidCurrencyAmountError extends CurrencyError {
  constructor(amount: number) {
    super('ITEM_ENGINE_INVALID_CURRENCY_AMOUNT', `Currency amount must be finite and non-negative: ${amount}`)
  }
}

export class InsufficientFundsError extends CurrencyError {
  constructor(characterId: string, balance: number, requested: number) {
    super('ITEM_ENGINE_INSUFFICIENT_FUNDS', `Insufficient funds for ${characterId}: ${balance} < ${requested}`)
  }
}

export class InvalidPriceBoundsError extends CurrencyError {
  constructor(min: number, max: number) {
    super('ITEM_ENGINE_INVALID_PRICE_BOUNDS', `Price clamp bounds must be finite and ordered: ${min}..${max}`)
  }
}

function requireCharacterId(characterId: string): string {
  if (!characterId.trim()) throw new Error('Character id required')
  return characterId
}

function requireAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) throw new InvalidCurrencyAmountError(amount)
  return amount
}

function requireBounds(min: number, max: number): void {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) throw new InvalidPriceBoundsError(min, max)
}

export function clampProposedPrice(proposed: number, opts: PriceClampOptions = {}): number {
  const min = opts.min ?? DEFAULT_PRICE_CLAMP_MIN
  const max = opts.max ?? DEFAULT_PRICE_CLAMP_MAX
  requireBounds(min, max)
  if (!Number.isFinite(proposed)) throw new InvalidPriceBoundsError(min, max)
  return Math.min(max, Math.max(min, proposed))
}

class InMemoryCurrencyService implements CurrencyService {
  private readonly balances = new Map<string, number>()

  credit(characterId: string, amount: number): CurrencyBalanceSnapshot {
    const id = requireCharacterId(characterId)
    const nextBalance = this.getBalance(id) + requireAmount(amount)
    this.balances.set(id, nextBalance)
    return { characterId: id, balance: nextBalance }
  }

  debit(characterId: string, amount: number): CurrencyBalanceSnapshot {
    const id = requireCharacterId(characterId)
    const requested = requireAmount(amount)
    const balance = this.getBalance(id)
    if (requested > balance) throw new InsufficientFundsError(id, balance, requested)
    const nextBalance = balance - requested
    this.balances.set(id, nextBalance)
    return { characterId: id, balance: nextBalance }
  }

  getBalance(characterId: string): number {
    return this.balances.get(requireCharacterId(characterId)) ?? 0
  }
}

export function createCurrencyService(): CurrencyService {
  return new InMemoryCurrencyService()
}
