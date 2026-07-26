import type { WizardPhase } from '../../../shared/onboarding/types.js'
import { WIZARD_PHASES } from '../../../shared/onboarding/types.js'

export { WIZARD_PHASES, type WizardPhase } from '../../../shared/onboarding/types.js'

export function nextWizardPhase(phase: WizardPhase): WizardPhase {
  const index = WIZARD_PHASES.indexOf(phase)
  return WIZARD_PHASES[index + 1] ?? phase
}

export function previousWizardPhase(phase: WizardPhase): WizardPhase {
  const index = WIZARD_PHASES.indexOf(phase)
  return WIZARD_PHASES[Math.max(0, index - 1)] ?? phase
}

export function canEnterPlay(phase: WizardPhase): boolean {
  return phase === 'complete'
}
