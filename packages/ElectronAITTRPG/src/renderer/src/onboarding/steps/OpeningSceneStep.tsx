import type { FormEvent } from 'react'
import { useEffect } from 'react'
import { WizardContinue } from './MechanicalSetupStep'

type OpeningSceneStepProps = {
  scene?: string
  busy: boolean
  errors: string[]
  onGenerate: () => Promise<void>
  onConfirm: () => Promise<void>
}

export function OpeningSceneStep(props: OpeningSceneStepProps): JSX.Element {
  useEffect(() => {
    if (props.scene !== undefined) return
    void props.onGenerate()
  }, [props.onGenerate, props.scene])

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await props.onConfirm()
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <p className="onboarding-scene">Review your opening scene, then confirm to enter the world.</p>
      {props.errors.map((entry) => (
        <p key={entry} className="onboarding-error">
          {entry}
        </p>
      ))}
      <div className="onboarding-chat-log">
        {props.scene ? <p className="onboarding-scene">{props.scene}</p> : <p>Generating opening scene…</p>}
      </div>
      <WizardContinue disabled={props.busy || props.scene === undefined} label="Enter world" />
    </form>
  )
}
