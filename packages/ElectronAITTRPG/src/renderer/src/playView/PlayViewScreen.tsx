import { useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import type { SceneBlock, SocialLine } from '@weaver/narration-engine'
import type {
  AskDmHistoryEntry,
  CombatChromeSnapshot,
  D20RollFeedback,
  PlayContext,
  SubmitPlayActionResult
} from '../../../shared/play/types'
import { nextD20OverlayState, type D20OverlayState } from './d20OverlayState'
import { incomingGlowIds } from './glowState'
import { parseNarrativeEmphasis, type NarrativeSegment } from './narrativeEmphasis'
import {
  applyPlayTurnOutcome,
  createPlayTurnUiState,
  reducePlayTurnUi,
  type PlayTurnUiState
} from './playTurnState'
import './playView.css'

type PlayViewScreenProps = PlayContext

export function PlayViewScreen(props: PlayViewScreenProps): JSX.Element {
  const [ui, setUi] = useState(createPlayTurnUiState)
  const [glowIds, setGlowIds] = useState<string[]>([])
  const [roll, setRoll] = useState<D20OverlayState>({ phase: 'idle' })
  const [streamingText, setStreamingText] = useState('')
  const [askEntries, setAskEntries] = useState<AskDmHistoryEntry[]>([])

  async function submit(text: string): Promise<void> {
    const previousSocialIds = ui.social.map((line) => line.id)
    setUi((current) => reducePlayTurnUi(current, { type: 'submit-started', text }))
    const result = await window.aiTtrpg.play.submitAction({ ...props, text })
    await applySubmitResult(result, {
      previousSocialIds,
      setUi,
      setGlowIds,
      setStreamingText,
      setRoll
    })
  }

  async function ask(question: string): Promise<void> {
    const result = await window.aiTtrpg.play.askDm({ ...props, question })
    setAskEntries(result.entries)
  }

  return (
    <main className="main-panel play-view">
      <CombatChrome combat={ui.combat} />
      <TurnFailureBanner message={ui.turnError} onDismiss={() => setUi((c) => reducePlayTurnUi(c, { type: 'clear-error' }))} />
      <section className="play-view-columns">
        <SceneColumn scene={ui.scene} />
        <SocialColumn social={ui.social} streamingText={streamingText} glowIds={glowIds} />
      </section>
      <SessionInput
        text={ui.draftText}
        busy={ui.busy}
        onChange={(text) => setUi((current) => reducePlayTurnUi(current, { type: 'draft', text }))}
        onSubmit={submit}
      />
      <AskDmPanel entries={askEntries} onAsk={ask} />
      <D20Overlay state={roll} />
    </main>
  )
}

type SubmitResultHandlers = {
  previousSocialIds: string[]
  setUi: Dispatch<SetStateAction<PlayTurnUiState>>
  setGlowIds: Dispatch<SetStateAction<string[]>>
  setStreamingText: Dispatch<SetStateAction<string>>
  setRoll: Dispatch<SetStateAction<D20OverlayState>>
}

async function applySubmitResult(
  result: SubmitPlayActionResult,
  handlers: SubmitResultHandlers
): Promise<void> {
  if (!result.ok) {
    handlers.setUi((current) =>
      reducePlayTurnUi(current, { type: 'submit-failed', message: result.message })
    )
    return
  }
  handlers.setUi((current) => applyPlayTurnOutcome(current, result))
  handlers.setGlowIds(
    incomingGlowIds(handlers.previousSocialIds, result.social.map((line) => line.id))
  )
  await streamLatestSocial(result.social, handlers.setStreamingText)
  showRoll(result.roll, handlers.setRoll)
}

function TurnFailureBanner(props: {
  message: string | null
  onDismiss: () => void
}): JSX.Element | null {
  if (props.message === null) return null
  return (
    <aside className="play-turn-error" role="status">
      <p>{props.message}</p>
      <button type="button" onClick={props.onDismiss}>
        Dismiss
      </button>
    </aside>
  )
}

function SceneColumn(props: { scene: SceneBlock[] }): JSX.Element {
  return (
    <section className="play-column scene-column" aria-label="Scene">
      <h2>Scene</h2>
      {props.scene.map((block) => (
        <p key={block.id}>
          <EmphasisText segments={parseNarrativeEmphasis(block.text)} />
        </p>
      ))}
    </section>
  )
}

function SocialColumn(props: {
  social: SocialLine[]
  streamingText: string
  glowIds: string[]
}): JSX.Element {
  return (
    <section className="play-column social-column" aria-label="Social">
      <h2>Social</h2>
      {props.social.map((line) => (
        <p key={line.id} className={props.glowIds.includes(line.id) ? 'social-line social-line-glow' : 'social-line'}>
          <strong>{line.speakerId}</strong>: {line.text}
        </p>
      ))}
      {props.streamingText.length > 0 ? <p className="social-line social-streaming">{props.streamingText}</p> : null}
    </section>
  )
}

function SessionInput(props: {
  text: string
  busy: boolean
  onChange: (text: string) => void
  onSubmit: (text: string) => Promise<void>
}): JSX.Element {
  return (
    <form
      className="play-input"
      onSubmit={(event) => void submitSession(event, props.text, props.busy, props.onSubmit)}
    >
      <input
        value={props.text}
        disabled={props.busy}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder="What do you do?"
      />
      <button type="submit" disabled={props.busy}>
        Send
      </button>
    </form>
  )
}

function AskDmPanel(props: {
  entries: AskDmHistoryEntry[]
  onAsk: (question: string) => Promise<void>
}): JSX.Element {
  const [question, setQuestion] = useState('')
  return (
    <aside className="ask-dm-panel" aria-label="Ask the DM">
      <h2>Ask the DM (OOC)</h2>
      {props.entries.map((entry, index) => (
        <p key={`${entry.speaker}-${index}`}>
          <strong>{entry.speaker}</strong>: {entry.text}
        </p>
      ))}
      <form onSubmit={(event) => void submitForm(event, question, setQuestion, props.onAsk)}>
        <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Rules or lore question" />
        <button type="submit">Ask</button>
      </form>
    </aside>
  )
}

function CombatChrome(props: { combat: CombatChromeSnapshot }): JSX.Element | null {
  if (!props.combat.active) return null
  return (
    <section className="combat-chrome" aria-label="Combat status">
      <h2>Round {props.combat.round}</h2>
      <ol>
        {props.combat.turnOrder.map((entry) => (
          <li key={entry.combatantId} className={entry.isActive ? 'combat-active' : undefined}>
            {entry.displayName} {entry.hp === null ? '' : `${entry.hp.current}/${entry.hp.max} HP`}
            {entry.conditions.length > 0 ? ` - ${entry.conditions.join(', ')}` : ''}
          </li>
        ))}
      </ol>
    </section>
  )
}

function D20Overlay(props: { state: D20OverlayState }): JSX.Element | null {
  if (props.state.phase === 'idle') return null
  return (
    <div className={`d20-overlay d20-overlay-${props.state.phase}`} aria-live="polite">
      <span>d20</span>
      <strong>{props.state.roll}</strong>
      <small>{props.state.label}</small>
    </div>
  )
}

function EmphasisText(props: { segments: NarrativeSegment[] }): JSX.Element {
  return (
    <>
      {props.segments.map((segment, index) => (
        <EmphasisSegment key={`${segment.text}-${index}`} segment={segment} />
      ))}
    </>
  )
}

function EmphasisSegment(props: { segment: NarrativeSegment }): JSX.Element {
  if (props.segment.emphasis === 'bold') return <strong>{props.segment.text}</strong>
  if (props.segment.emphasis === 'italic') return <em>{props.segment.text}</em>
  return <>{props.segment.text}</>
}

function submitSession(
  event: FormEvent,
  text: string,
  busy: boolean,
  submit: (text: string) => Promise<void>
): Promise<void> {
  event.preventDefault()
  const trimmed = text.trim()
  if (busy || trimmed.length === 0) return Promise.resolve()
  return submit(trimmed)
}

function submitForm(
  event: FormEvent,
  text: string,
  setText: (text: string) => void,
  submit: (text: string) => Promise<void>
): Promise<void> {
  event.preventDefault()
  const trimmed = text.trim()
  if (trimmed.length === 0) return Promise.resolve()
  setText('')
  return submit(trimmed)
}

async function streamLatestSocial(
  lines: readonly SocialLine[],
  setStreamingText: Dispatch<SetStateAction<string>>
): Promise<void> {
  const latest = lines.at(-1)
  if (latest === undefined) return
  setStreamingText('')
  for (const chunk of latest.text.match(/\S+\s*/g) ?? [latest.text]) {
    setStreamingText((previous) => `${previous}${chunk}`)
    await delay(24)
  }
  setStreamingText('')
}

function showRoll(
  feedback: D20RollFeedback | null,
  setRoll: Dispatch<SetStateAction<D20OverlayState>>
): void {
  if (feedback === null || !feedback.visible) return
  setRoll(nextD20OverlayState({ phase: 'idle' }, { type: 'show', label: feedback.label, roll: feedback.roll }))
  window.setTimeout(() => setRoll((state) => nextD20OverlayState(state, { type: 'settle' })), 450)
  window.setTimeout(() => setRoll({ phase: 'idle' }), 1400)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
