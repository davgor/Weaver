import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import type { GuidedCreationTranscriptEntry } from '@weaver/dm-engine'
import { WizardContinue } from './MechanicalSetupStep'

type GuidedIdentityStepProps = {
  transcript: GuidedCreationTranscriptEntry[]
  phaseLabel?: string
  busy: boolean
  errors: string[]
  onStart: () => Promise<void>
  onSubmit: (message: string) => Promise<void>
}

export function GuidedIdentityStep(props: GuidedIdentityStepProps): JSX.Element {
  const [message, setMessage] = useState('')
  const started = useGuidedIdentityStart(props.onStart, props.transcript.length)

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (message.trim().length === 0) return
    await props.onSubmit(message.trim())
    setMessage('')
  }

  return (
    <form className="onboarding-body" onSubmit={(event) => void submit(event)}>
      <p className="onboarding-scene">
        Guided identity: <strong>{props.phaseLabel ?? 'who'}</strong> — who / why / where / what
      </p>
      <GuidedIdentityTranscript transcript={props.transcript} started={started} />
      <GuidedIdentityErrors errors={props.errors} />
      <label className="onboarding-field">
        <span>Your reply</span>
        <textarea
          rows={3}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={props.busy || !started}
        />
      </label>
      <WizardContinue disabled={props.busy || !started || message.trim().length === 0} label="Send" />
    </form>
  )
}

function useGuidedIdentityStart(onStart: () => Promise<void>, transcriptLength: number): boolean {
  const [started, setStarted] = useState(transcriptLength > 0)
  useEffect(() => {
    if (transcriptLength > 0) {
      setStarted(true)
      return
    }
    void onStart().then(() => setStarted(true))
  }, [onStart, transcriptLength])
  return started
}

function GuidedIdentityTranscript(props: {
  transcript: GuidedCreationTranscriptEntry[]
  started: boolean
}): JSX.Element {
  return (
    <div className="onboarding-chat-log" aria-live="polite">
      {props.transcript.map((entry, index) => (
        <p
          key={`${entry.phase}-${index}`}
          className={
            entry.speaker === 'dm' ? 'onboarding-chat-entry onboarding-chat-entry-dm' : 'onboarding-chat-entry'
          }
        >
          <strong>{entry.speaker === 'dm' ? 'DM' : 'You'}:</strong> {entry.text}
        </p>
      ))}
      {!props.started ? <p className="onboarding-chat-entry">Starting guided identity…</p> : null}
    </div>
  )
}

function GuidedIdentityErrors(props: { errors: string[] }): JSX.Element {
  return (
    <>
      {props.errors.map((entry) => (
        <p key={entry} className="onboarding-error">
          {entry}
        </p>
      ))}
    </>
  )
}
