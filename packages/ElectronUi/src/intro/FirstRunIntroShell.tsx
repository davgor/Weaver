import type { ReactNode } from 'react'

export interface FirstRunIntroAction {
  label: string
  onClick: () => void
  disabled?: boolean | undefined
}

export interface FirstRunIntroShellProps {
  title: string
  lead: string
  children?: ReactNode
  stepContent?: ReactNode
  primaryAction?: FirstRunIntroAction | undefined
  secondaryAction?: FirstRunIntroAction | undefined
}

export function FirstRunIntroShell(props: FirstRunIntroShellProps): JSX.Element {
  const content = props.stepContent ?? props.children

  return (
    <div className="first-run-intro-overlay" role="presentation">
      <section
        className="first-run-intro-shell"
        role="dialog"
        aria-modal="true"
        aria-labelledby="first-run-intro-title"
      >
        <header className="first-run-intro-header">
          <h2 id="first-run-intro-title">{props.title}</h2>
          <p className="first-run-intro-lead">{props.lead}</p>
        </header>
        {content ? <div className="first-run-intro-step">{content}</div> : null}
        <IntroActions primary={props.primaryAction} secondary={props.secondaryAction} />
      </section>
    </div>
  )
}

function IntroActions(props: {
  primary?: FirstRunIntroAction | undefined
  secondary?: FirstRunIntroAction | undefined
}): JSX.Element | null {
  if (!props.primary && !props.secondary) return null

  return (
    <footer className="first-run-intro-actions">
      {props.primary ? <ActionButton action={props.primary} variant="primary" /> : null}
      {props.secondary ? <ActionButton action={props.secondary} variant="secondary" /> : null}
    </footer>
  )
}

function ActionButton(props: {
  action: FirstRunIntroAction
  variant: 'primary' | 'secondary'
}): JSX.Element {
  const className = `first-run-intro-action first-run-intro-action-${props.variant}`

  return (
    <button
      type="button"
      className={className}
      disabled={props.action.disabled}
      onClick={props.action.disabled ? undefined : props.action.onClick}
    >
      {props.action.label}
    </button>
  )
}
