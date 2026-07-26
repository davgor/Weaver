import type { FormEvent } from 'react'
import { useState } from 'react'
import type { RaceRosterEntry } from '@weaver/character-engine'
import { WizardContinue } from './MechanicalSetupStep'

type RaceStepProps = {
  races: RaceRosterEntry[]
  initialRaceId?: string
  busy: boolean
  onContinue: (raceId: string) => Promise<void>
}

export function RaceStep(props: RaceStepProps): JSX.Element {
  const [raceId, setRaceId] = useState(props.initialRaceId ?? props.races[0]?.raceId ?? '')
  const selected = props.races.find((race) => race.raceId === raceId)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (raceId.length === 0) return
    await props.onContinue(raceId)
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <div className="onboarding-choice-grid">
        {props.races.map((race) => (
          <label key={race.raceId} className="onboarding-choice">
            <input
              type="radio"
              name="race"
              checked={raceId === race.raceId}
              onChange={() => setRaceId(race.raceId)}
              disabled={props.busy}
            />
            <span>
              <strong>{race.name}</strong>
              {race.lore ? <small>{race.lore}</small> : null}
            </span>
          </label>
        ))}
      </div>
      {selected?.lore ? <p className="onboarding-scene">{selected.lore}</p> : null}
      <WizardContinue disabled={props.busy || raceId.length === 0} />
    </form>
  )
}
