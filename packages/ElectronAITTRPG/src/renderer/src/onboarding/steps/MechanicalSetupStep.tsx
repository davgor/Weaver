import type { FormEvent } from 'react'
import { useState } from 'react'
import type { Ability, AbilityScores } from '@weaver/character-engine'
import { ABILITIES } from '@weaver/character-engine'
import type { ArchetypeDefinition } from '@weaver/character-engine'
import type { AbilityGenerationMethod } from '../../../../shared/onboarding/types'

type MechanicalSetupStepProps = {
  archetypes: ArchetypeDefinition[]
  initialArchetype?: string
  initialMethod?: AbilityGenerationMethod
  initialScores?: AbilityScores
  busy: boolean
  onRoll: () => Promise<{ scores: AbilityScores } | null>
  onContinue: (payload: {
    archetype: ArchetypeDefinition['id']
    method: AbilityGenerationMethod
    scores: AbilityScores
  }) => Promise<void>
}

const STANDARD_ARRAY: AbilityScores = { Body: 14, Agility: 12, Mind: 10, Presence: 8 }
const POINT_BUY_DEFAULT: AbilityScores = { Body: 10, Agility: 10, Mind: 10, Presence: 10 }

export function MechanicalSetupStep(props: MechanicalSetupStepProps): JSX.Element {
  const state = useMechanicalSetupState(props)
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    await props.onContinue({
      archetype: state.archetype as ArchetypeDefinition['id'],
      method: state.method,
      scores: state.scores
    })
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <ArchetypeField
        archetypes={props.archetypes}
        archetype={state.archetype}
        busy={props.busy}
        onChange={state.setArchetype}
      />
      <AbilityMethodField method={state.method} busy={props.busy} onChange={state.setMethod} />
      <AbilityScorePanel
        method={state.method}
        scores={state.scores}
        busy={props.busy}
        onRoll={props.onRoll}
        onScoresChange={state.setScores}
      />
      <WizardContinue disabled={props.busy} />
    </form>
  )
}

function useMechanicalSetupState(props: MechanicalSetupStepProps) {
  const [archetype, setArchetype] = useState(props.initialArchetype ?? props.archetypes[0]?.id ?? 'Fighter')
  const [method, setMethod] = useState<AbilityGenerationMethod>(props.initialMethod ?? 'standard_array')
  const [scores, setScores] = useState<AbilityScores>(props.initialScores ?? STANDARD_ARRAY)
  return { archetype, method, scores, setArchetype, setMethod, setScores }
}

function ArchetypeField(props: {
  archetypes: ArchetypeDefinition[]
  archetype: string
  busy: boolean
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="onboarding-field">
      <span>Archetype</span>
      <select value={props.archetype} onChange={(event) => props.onChange(event.target.value)} disabled={props.busy}>
        {props.archetypes.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function AbilityMethodField(props: {
  method: AbilityGenerationMethod
  busy: boolean
  onChange: (method: AbilityGenerationMethod) => void
}): JSX.Element {
  return (
    <fieldset className="onboarding-field" disabled={props.busy}>
      <legend>Ability generation</legend>
      {(['standard_array', 'point_buy', 'roll'] as const).map((entry) => (
        <label key={entry} className="onboarding-choice">
          <input
            type="radio"
            name="abilityMethod"
            checked={props.method === entry}
            onChange={() => props.onChange(entry)}
          />
          <span>{abilityMethodLabel(entry)}</span>
        </label>
      ))}
    </fieldset>
  )
}

function AbilityScorePanel(props: {
  method: AbilityGenerationMethod
  scores: AbilityScores
  busy: boolean
  onRoll: () => Promise<{ scores: AbilityScores } | null>
  onScoresChange: (scores: AbilityScores) => void
}): JSX.Element {
  if (props.method === 'roll') {
    return (
      <button
        type="button"
        disabled={props.busy}
        onClick={() => {
          void props.onRoll().then((draft) => {
            if (draft !== null) props.onScoresChange(draft.scores)
          })
        }}
      >
        Roll abilities
      </button>
    )
  }
  return (
    <AbilityScoreFields
      scores={props.method === 'standard_array' ? STANDARD_ARRAY : props.scores}
      editable={props.method === 'point_buy'}
      onChange={props.onScoresChange}
    />
  )
}

function AbilityScoreFields(props: {
  scores: AbilityScores
  editable: boolean
  onChange: (scores: AbilityScores) => void
}): JSX.Element {
  return (
    <div className="onboarding-choice-grid">
      {ABILITIES.map((ability) => (
        <label key={ability} className="onboarding-field">
          <span>{ability}</span>
          <input
            type="number"
            min={8}
            max={20}
            value={props.scores[ability]}
            disabled={!props.editable}
            onChange={(event) => updateScore(props, ability, Number(event.target.value))}
          />
        </label>
      ))}
    </div>
  )
}

function updateScore(
  props: { scores: AbilityScores; onChange: (scores: AbilityScores) => void },
  ability: Ability,
  value: number
): void {
  props.onChange({ ...props.scores, [ability]: value })
}

function abilityMethodLabel(method: AbilityGenerationMethod): string {
  if (method === 'standard_array') return 'Standard array (14 / 12 / 10 / 8)'
  if (method === 'point_buy') return 'Point buy (12 points, scores 8–20)'
  return 'Roll 4d6 drop lowest'
}

export function WizardContinue(props: { disabled?: boolean; label?: string }): JSX.Element {
  return (
    <footer className="onboarding-actions">
      <span />
      <button type="submit" disabled={props.disabled}>
        {props.label ?? 'Continue'}
      </button>
    </footer>
  )
}

export const defaultAbilityScores = POINT_BUY_DEFAULT
