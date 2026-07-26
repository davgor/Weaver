import type { FormEvent } from 'react'
import { useState } from 'react'
import type { BackgroundRosterEntry } from '@weaver/character-engine'
import { WizardContinue } from './MechanicalSetupStep'

type BackgroundStepProps = {
  backgrounds: BackgroundRosterEntry[]
  initialBackgroundId?: string
  initialPersonalStory?: string
  busy: boolean
  onContinue: (backgroundId: string, personalStory?: string) => Promise<void>
}

export function BackgroundStep(props: BackgroundStepProps): JSX.Element {
  const [backgroundId, setBackgroundId] = useState(
    props.initialBackgroundId ?? props.backgrounds[0]?.backgroundId ?? ''
  )
  const [personalStory, setPersonalStory] = useState(props.initialPersonalStory ?? '')
  const selected = props.backgrounds.find((entry) => entry.backgroundId === backgroundId)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (backgroundId.length === 0) return
    await props.onContinue(backgroundId, personalStory.trim().length > 0 ? personalStory : undefined)
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <div className="onboarding-choice-grid">
        {props.backgrounds.map((entry) => (
          <label key={entry.backgroundId} className="onboarding-choice">
            <input
              type="radio"
              name="background"
              checked={backgroundId === entry.backgroundId}
              onChange={() => setBackgroundId(entry.backgroundId)}
              disabled={props.busy}
            />
            <span>
              <strong>{entry.name}</strong>
              <small>{entry.description}</small>
            </span>
          </label>
        ))}
      </div>
      {selected ? <p className="onboarding-scene">{selected.description}</p> : null}
      <label className="onboarding-field">
        <span>Personal story (optional)</span>
        <textarea
          rows={3}
          value={personalStory}
          onChange={(event) => setPersonalStory(event.target.value)}
          disabled={props.busy}
        />
      </label>
      <WizardContinue disabled={props.busy || backgroundId.length === 0} />
    </form>
  )
}
