import { describe, expect, it } from 'vitest'
import { lockTurn } from './lockTurn.js'
import { TurnRoutingError } from './types.js'

describe('lockTurn', () => {
  it('returns an unlock function that releases the same campaign+character key', () => {
    const unlock = lockTurn('camp-1', 'pc-1')
    expect(() => lockTurn('camp-1', 'pc-1')).toThrow(TurnRoutingError)
    unlock()
    const unlockAgain = lockTurn('camp-1', 'pc-1')
    unlockAgain()
  })

  it('allows different campaign or character keys concurrently', () => {
    const unlockA = lockTurn('camp-1', 'pc-1')
    const unlockB = lockTurn('camp-2', 'pc-1')
    const unlockC = lockTurn('camp-1', 'pc-2')
    unlockA()
    unlockB()
    unlockC()
  })

  it('throws DM_TURN_LOCK_CONFLICT when the same key is already locked', () => {
    const unlock = lockTurn('camp-lock', 'pc-lock')
    try {
      lockTurn('camp-lock', 'pc-lock')
      expect.unreachable('expected lock conflict')
    } catch (error) {
      expect(error).toBeInstanceOf(TurnRoutingError)
      expect((error as TurnRoutingError).code).toBe('DM_TURN_LOCK_CONFLICT')
    } finally {
      unlock()
    }
  })
})
