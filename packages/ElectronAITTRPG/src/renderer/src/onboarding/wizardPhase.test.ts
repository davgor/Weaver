import { describe, expect, it } from 'vitest'
import { WIZARD_PHASES } from '../../../shared/onboarding/types'
import { canEnterPlay, nextWizardPhase, previousWizardPhase } from './wizardPhase'

describe('wizardPhase', () => {
  it('lists phases in onboarding order through complete', () => {
    expect(WIZARD_PHASES).toEqual([
      'mechanical_setup',
      'race',
      'background',
      'equipment',
      'companions',
      'guided_identity',
      'opening_scene',
      'complete'
    ])
  })

  it('advances and retreats one step at a time', () => {
    expect(nextWizardPhase('mechanical_setup')).toBe('race')
    expect(nextWizardPhase('opening_scene')).toBe('complete')
    expect(previousWizardPhase('race')).toBe('mechanical_setup')
    expect(previousWizardPhase('mechanical_setup')).toBe('mechanical_setup')
  })

  it('only allows play after complete', () => {
    for (const phase of WIZARD_PHASES) {
      expect(canEnterPlay(phase)).toBe(phase === 'complete')
    }
  })
})
