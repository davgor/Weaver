import type { TellStoryFormState } from './tellStoryFormState'

type FieldKey = 'premise' | 'name' | 'personality' | 'appearance' | 'actCount'

type TellStoryFieldsProps = {
  state: TellStoryFormState
  busy: boolean
  help: string
  onChange: (next: TellStoryFormState) => void
  updateField: (state: TellStoryFormState, field: FieldKey, value: string) => TellStoryFormState
}

export function TellStoryFields(props: TellStoryFieldsProps): JSX.Element {
  const { state } = props
  const set = (field: FieldKey, value: string): void => {
    props.onChange(props.updateField(state, field, value))
  }
  return (
    <div className="tell-story-form">
      <label className="tell-story-field">
        <span>Premise</span>
        <textarea
          value={state.premise}
          disabled={props.busy}
          onChange={(event) => set('premise', event.target.value)}
          rows={4}
        />
      </label>
      <McTextField
        label="Main character name"
        value={state.mainCharacter.name}
        busy={props.busy}
        onChange={(value) => set('name', value)}
      />
      <McTextField
        label="Personality"
        value={state.mainCharacter.personality}
        busy={props.busy}
        onChange={(value) => set('personality', value)}
      />
      <McTextField
        label="Appearance"
        value={state.mainCharacter.appearance}
        busy={props.busy}
        onChange={(value) => set('appearance', value)}
      />
      <label className="tell-story-field">
        <span>Act count</span>
        <input
          type="number"
          min={1}
          max={7}
          value={state.actCount}
          disabled={props.busy}
          onChange={(event) => set('actCount', event.target.value)}
        />
        <small>{props.help}</small>
      </label>
      {state.error ? <p className="tell-story-error">{state.error}</p> : null}
    </div>
  )
}

function McTextField(props: {
  label: string
  value: string
  busy: boolean
  onChange: (value: string) => void
}): JSX.Element {
  return (
    <label className="tell-story-field">
      <span>{props.label}</span>
      <input
        value={props.value}
        disabled={props.busy}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </label>
  )
}
