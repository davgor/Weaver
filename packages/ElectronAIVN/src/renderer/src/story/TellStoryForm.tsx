import { FirstRunIntroShell } from '@weaver/electron-ui'
import {
  ACT_COUNT_HELP,
  type TellStoryFormState,
  updateTellStoryField
} from './tellStoryFormState'
import { TellStoryFields } from './TellStoryFields'

type TellStoryFormProps = {
  state: TellStoryFormState
  onChange: (next: TellStoryFormState) => void
  onSubmit: () => void
  onCancel: () => void
  busy: boolean
}

export function TellStoryForm(props: TellStoryFormProps): JSX.Element {
  return (
    <FirstRunIntroShell
      title="Tell a story"
      lead="Describe the premise and your main character. Weaver will draft a short visual-novel arc."
      primaryAction={{
        label: props.busy ? 'Generating…' : 'Generate story',
        onClick: props.onSubmit,
        disabled: props.busy
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: props.onCancel,
        disabled: props.busy
      }}
      stepContent={
        <TellStoryFields
          state={props.state}
          busy={props.busy}
          onChange={props.onChange}
          help={ACT_COUNT_HELP}
          updateField={updateTellStoryField}
        />
      }
    />
  )
}
