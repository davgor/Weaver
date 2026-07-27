import {
  BACKEND_CHOICE_OPTIONS,
  isBackendChoiceDisabled,
  selectBackend,
  type LocalModelBackend,
  type LocalModelStatusPhase
} from './backendChoice.js'

export interface BackendChoiceProps {
  backend: LocalModelBackend
  statusPhase: LocalModelStatusPhase
  onBackendChange: (backend: LocalModelBackend) => void
  installing?: boolean | undefined
}

export function BackendChoice(props: BackendChoiceProps): JSX.Element {
  const disabled = isBackendChoiceDisabled(props.statusPhase, props.installing ?? false)

  return (
    <fieldset className="local-model-backend" aria-label="Runtime backend">
      <legend>Runtime backend</legend>
      <div className="local-model-backend-options" role="radiogroup" aria-label="Runtime backend">
        {BACKEND_CHOICE_OPTIONS.map((option) => (
          <BackendChoiceRadio
            key={option.value}
            backend={props.backend}
            disabled={disabled}
            option={option}
            onBackendChange={props.onBackendChange}
          />
        ))}
      </div>
    </fieldset>
  )
}

function BackendChoiceRadio(props: {
  backend: LocalModelBackend
  disabled: boolean
  option: (typeof BACKEND_CHOICE_OPTIONS)[number]
  onBackendChange: (backend: LocalModelBackend) => void
}): JSX.Element {
  const id = `local-model-backend-${props.option.value}`

  return (
    <label className="local-model-backend-option" htmlFor={id}>
      <input
        id={id}
        type="radio"
        name="local-model-backend"
        value={props.option.value}
        checked={props.backend === props.option.value}
        disabled={props.disabled}
        onChange={() => changeBackend(props)}
      />
      <span>
        <strong>{props.option.label}</strong>
        <small>{props.option.description}</small>
      </span>
    </label>
  )
}

function changeBackend(props: {
  backend: LocalModelBackend
  disabled: boolean
  option: (typeof BACKEND_CHOICE_OPTIONS)[number]
  onBackendChange: (backend: LocalModelBackend) => void
}): void {
  const next = selectBackend(props.backend, props.option.value, props.disabled)
  if (next !== props.backend) props.onBackendChange(next)
}
