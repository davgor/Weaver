import { describe, expect, it } from 'vitest'
import {
  APP_FAILURE_MESSAGE,
  TURN_FAILURE_MESSAGE,
  playRecoveryCopy
} from './recoveryCopy.js'

describe('playRecoveryCopy', () => {
  it('distinguishes turn failure from app failure messaging', () => {
    expect(playRecoveryCopy('turn')).toBe(TURN_FAILURE_MESSAGE)
    expect(playRecoveryCopy('app')).toBe(APP_FAILURE_MESSAGE)
    expect(TURN_FAILURE_MESSAGE).toMatch(/didn't go through|try again/i)
    expect(APP_FAILURE_MESSAGE).toMatch(/wrong with the app/i)
    expect(TURN_FAILURE_MESSAGE).not.toBe(APP_FAILURE_MESSAGE)
  })
})
