import type { FormEvent } from 'react'
import { WizardContinue } from './MechanicalSetupStep'

type EquipmentStepProps = {
  archetype?: string
  busy: boolean
  onContinue: () => Promise<void>
}

export function EquipmentStep(props: EquipmentStepProps): JSX.Element {
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await props.onContinue()
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <p className="onboarding-scene">
        Confirm the starting loadout for your <strong>{props.archetype ?? 'chosen'}</strong>{' '}
        archetype. Starter gear and known actions are assigned through CharacterEngine.
      </p>
      <WizardContinue disabled={props.busy} />
    </form>
  )
}
