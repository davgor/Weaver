import { useEffect } from 'react'
import type { BeginOnboardingRequest } from '../../../shared/onboarding/types'
import { WIZARD_PHASES, type WizardPhase } from '../../../shared/onboarding/types'
import { useOnboardingWizard } from './useOnboardingWizard'
import { BackgroundStep } from './steps/BackgroundStep'
import { CompanionsStep } from './steps/CompanionsStep'
import { EquipmentStep } from './steps/EquipmentStep'
import { GuidedIdentityStep } from './steps/GuidedIdentityStep'
import { MechanicalSetupStep } from './steps/MechanicalSetupStep'
import { OpeningSceneStep } from './steps/OpeningSceneStep'
import { RaceStep } from './steps/RaceStep'
import './onboarding.css'

type OnboardingWizardProps = {
  request: BeginOnboardingRequest
  onComplete: () => void
}

type WizardState = ReturnType<typeof useOnboardingWizard>

export function OnboardingWizard(props: OnboardingWizardProps): JSX.Element {
  const wizard = useOnboardingWizard(props.request)

  useEffect(() => {
    if (wizard.readyForPlay) props.onComplete()
  }, [wizard.readyForPlay, props.onComplete])

  if (wizard.readyForPlay) {
    return <OnboardingCompletePanel />
  }

  return (
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <section className="modal-panel onboarding-panel" aria-label="Character onboarding">
        <header className="onboarding-header">
          <p className="eyebrow">Character onboarding</p>
          <h1>{props.request.characterName}</h1>
          <WizardPhaseRail phase={wizard.snapshot?.phase ?? 'mechanical_setup'} />
        </header>
        {wizard.error !== null ? <p className="onboarding-error">{wizard.error}</p> : null}
        {renderWizardStep(wizard)}
        <footer className="onboarding-actions">
          <button
            type="button"
            disabled={wizard.busy || wizard.snapshot?.phase === 'mechanical_setup'}
            onClick={() => void wizard.goBack()}
          >
            Back
          </button>
        </footer>
      </section>
    </div>
  )
}

function OnboardingCompletePanel(): JSX.Element {
  return (
    <div className="modal-overlay onboarding-overlay" role="dialog" aria-modal="true">
      <section className="modal-panel onboarding-panel" aria-label="Character onboarding complete">
        <p className="onboarding-scene">Onboarding complete — entering play is unlocked.</p>
      </section>
    </div>
  )
}

function WizardPhaseRail(props: { phase: WizardPhase }): JSX.Element {
  return (
    <nav className="onboarding-step-list" aria-label="Onboarding steps">
      {WIZARD_PHASES.filter((phase) => phase !== 'complete').map((phase) => (
        <span
          key={phase}
          className={
            phase === props.phase ? 'onboarding-step-pill onboarding-step-pill-active' : 'onboarding-step-pill'
          }
        >
          {phase.replaceAll('_', ' ')}
        </span>
      ))}
    </nav>
  )
}

function renderWizardStep(wizard: WizardState): JSX.Element | null {
  if (wizard.snapshot === null || wizard.resources === null) {
    return <p className="onboarding-scene">Loading onboarding…</p>
  }
  const renderer = wizardStepRenderers[wizard.snapshot.phase]
  return renderer === undefined ? null : renderer(wizard)
}

const wizardStepRenderers: Partial<Record<WizardPhase, (wizard: WizardState) => JSX.Element>> = {
  mechanical_setup: (wizard) => {
    const selections = wizard.snapshot!.selections
    return (
      <MechanicalSetupStep
        archetypes={wizard.resources!.archetypes}
        busy={wizard.busy}
        {...(selections.archetype === undefined ? {} : { initialArchetype: selections.archetype })}
        {...(selections.abilityMethod === undefined ? {} : { initialMethod: selections.abilityMethod })}
        {...(selections.abilityScores === undefined ? {} : { initialScores: selections.abilityScores })}
        onRoll={async () => {
          const draft = await wizard.rollAbilityScores()
          return draft === null ? null : { scores: draft.scores }
        }}
        onContinue={async (payload) => wizard.saveMechanicalSetup(payload)}
      />
    )
  },
  race: (wizard) => (
    <RaceStep
      races={wizard.resources!.races}
      {...(wizard.snapshot!.selections.raceId === undefined
        ? {}
        : { initialRaceId: wizard.snapshot!.selections.raceId })}
      busy={wizard.busy}
      onContinue={async (raceId) => wizard.saveRace({ raceId })}
    />
  ),
  background: (wizard) => (
    <BackgroundStep
      backgrounds={wizard.resources!.backgrounds}
      {...(wizard.snapshot!.selections.backgroundId === undefined
        ? {}
        : { initialBackgroundId: wizard.snapshot!.selections.backgroundId })}
      {...(wizard.snapshot!.selections.personalStory === undefined
        ? {}
        : { initialPersonalStory: wizard.snapshot!.selections.personalStory })}
      busy={wizard.busy}
      onContinue={async (backgroundId, personalStory) =>
        wizard.saveBackground(
          personalStory === undefined ? { backgroundId } : { backgroundId, personalStory }
        )
      }
    />
  ),
  equipment: (wizard) => (
    <EquipmentStep
      {...(wizard.snapshot!.selections.archetype === undefined
        ? {}
        : { archetype: wizard.snapshot!.selections.archetype })}
      busy={wizard.busy}
      onContinue={async () => wizard.saveEquipment()}
    />
  ),
  companions: (wizard) => (
    <CompanionsStep
      archetypes={wizard.resources!.archetypes}
      {...(wizard.snapshot!.selections.companionSkipped === undefined
        ? {}
        : { initialSkipped: wizard.snapshot!.selections.companionSkipped })}
      {...(wizard.snapshot!.selections.companionName === undefined
        ? {}
        : { initialName: wizard.snapshot!.selections.companionName })}
      {...(wizard.snapshot!.selections.companionArchetype === undefined
        ? {}
        : { initialArchetype: wizard.snapshot!.selections.companionArchetype })}
      busy={wizard.busy}
      onSkip={async () => wizard.saveCompanions({ action: 'skip' })}
      onCreate={async (name, archetype) =>
        wizard.saveCompanions({ action: 'create', name, archetype })
      }
    />
  ),
  guided_identity: (wizard) => (
    <GuidedIdentityStep
      transcript={wizard.snapshot!.guidedCreation?.transcript ?? []}
      {...(wizard.snapshot!.guidedCreation?.guidedCreationPhase === undefined
        ? {}
        : { phaseLabel: wizard.snapshot!.guidedCreation!.guidedCreationPhase })}
      busy={wizard.busy}
      errors={wizard.chatErrors}
      onStart={async () => wizard.startGuidedIdentity()}
      onSubmit={async (message) => wizard.submitGuidedIdentity(message)}
    />
  ),
  opening_scene: (wizard) => renderOpeningScene(wizard),
  complete: (wizard) => renderOpeningScene(wizard)
}

function renderOpeningScene(wizard: WizardState): JSX.Element {
  const scene = wizard.snapshot!.openingScene ?? wizard.snapshot!.guidedCreation?.openingScene
  return (
    <OpeningSceneStep
      {...(scene === undefined ? {} : { scene })}
      busy={wizard.busy}
      errors={wizard.chatErrors}
      onGenerate={async () => wizard.generateOpeningScene()}
      onConfirm={async () => wizard.confirmOpeningScene()}
    />
  )
}
