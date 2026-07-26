import type { FormEvent } from 'react'
import { useState } from 'react'
import type { ArchetypeDefinition } from '@weaver/character-engine'
import { WizardContinue } from './MechanicalSetupStep'

type CompanionsStepProps = {
  archetypes: ArchetypeDefinition[]
  initialSkipped?: boolean
  initialName?: string
  initialArchetype?: string
  busy: boolean
  onSkip: () => Promise<void>
  onCreate: (name: string, archetype: ArchetypeDefinition['id']) => Promise<void>
}

export function CompanionsStep(props: CompanionsStepProps): JSX.Element {
  const state = useCompanionFormState(props)
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (state.mode === 'skip') {
      await props.onSkip()
      return
    }
    if (state.name.trim().length === 0) return
    await props.onCreate(state.name.trim(), state.archetype as ArchetypeDefinition['id'])
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <p className="onboarding-scene">
        Add an optional AI companion for this campaign, or skip and travel alone.
      </p>
      <CompanionModeField mode={state.mode} busy={props.busy} onChange={state.setMode} />
      {state.mode === 'create' ? (
        <CompanionCreateFields
          archetypes={props.archetypes}
          name={state.name}
          archetype={state.archetype}
          busy={props.busy}
          onNameChange={state.setName}
          onArchetypeChange={state.setArchetype}
        />
      ) : null}
      <WizardContinue
        disabled={props.busy || (state.mode === 'create' && state.name.trim().length === 0)}
        label="Continue"
      />
    </form>
  )
}

function useCompanionFormState(props: CompanionsStepProps) {
  const [mode, setMode] = useState<'skip' | 'create'>(props.initialSkipped ? 'skip' : 'create')
  const [name, setName] = useState(props.initialName ?? '')
  const [archetype, setArchetype] = useState(
    props.initialArchetype ?? props.archetypes[0]?.id ?? 'Fighter'
  )
  return { mode, name, archetype, setMode, setName, setArchetype }
}

function CompanionModeField(props: {
  mode: 'skip' | 'create'
  busy: boolean
  onChange: (mode: 'skip' | 'create') => void
}): JSX.Element {
  return (
    <fieldset className="onboarding-field" disabled={props.busy}>
      <legend>Companion choice</legend>
      <label className="onboarding-choice">
        <input type="radio" name="companionMode" checked={props.mode === 'skip'} onChange={() => props.onChange('skip')} />
        <span>Skip companion creation</span>
      </label>
      <label className="onboarding-choice">
        <input type="radio" name="companionMode" checked={props.mode === 'create'} onChange={() => props.onChange('create')} />
        <span>Create a companion</span>
      </label>
    </fieldset>
  )
}

function CompanionCreateFields(props: {
  archetypes: ArchetypeDefinition[]
  name: string
  archetype: string
  busy: boolean
  onNameChange: (value: string) => void
  onArchetypeChange: (value: string) => void
}): JSX.Element {
  return (
    <>
      <label className="onboarding-field">
        <span>Companion name</span>
        <input type="text" value={props.name} onChange={(event) => props.onNameChange(event.target.value)} disabled={props.busy} />
      </label>
      <label className="onboarding-field">
        <span>Companion archetype</span>
        <select value={props.archetype} onChange={(event) => props.onArchetypeChange(event.target.value)} disabled={props.busy}>
          {props.archetypes.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
