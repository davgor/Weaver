import { describe, expect, it } from 'vitest'
import { canDismissFirstRun, evaluateFirstRunGate } from './firstRunGate.js'

describe('evaluateFirstRunGate — not ready', () => {
  it('needs setup when the local model is not installed', () => {
    expect(
      evaluateFirstRunGate({
        localPhase: 'not_installed',
        backendChosen: false,
        dismissed: false
      })
    ).toMatchObject({ needed: true, ready: false, canDismiss: false })
  })

  it('needs setup while the local model is installing', () => {
    expect(
      evaluateFirstRunGate({
        localPhase: 'installing',
        backendChosen: true,
        dismissed: false
      })
    ).toMatchObject({ needed: true, ready: false, canDismiss: false })
  })

  it('needs setup when ready without a backend preference', () => {
    expect(
      evaluateFirstRunGate({
        localPhase: 'ready',
        backendChosen: false,
        dismissed: false
      })
    ).toMatchObject({ needed: true, ready: false, canDismiss: false })
  })
})

describe('evaluateFirstRunGate — ready / dismiss', () => {
  it('allows dismiss when the model is ready and a backend is chosen', () => {
    expect(
      evaluateFirstRunGate({
        localPhase: 'ready',
        backendChosen: true,
        dismissed: false
      })
    ).toMatchObject({ needed: true, ready: true, canDismiss: true, reason: null })
  })

  it('does not need the intro after dismiss', () => {
    expect(
      evaluateFirstRunGate({
        localPhase: 'ready',
        backendChosen: true,
        dismissed: true
      })
    ).toMatchObject({ needed: false, dismissed: true, ready: true })
  })
})

describe('canDismissFirstRun', () => {
  it('only allows dismissal once setup is ready', () => {
    expect(canDismissFirstRun(false)).toBe(false)
    expect(canDismissFirstRun(true)).toBe(true)
  })
})
