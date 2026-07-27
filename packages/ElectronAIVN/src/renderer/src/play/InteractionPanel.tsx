type InteractionPanelProps = {
  options: [string, string]
  freeText: string
  busy: boolean
  onFreeTextChange: (value: string) => void
  onChoose: (text: string) => void
}

export function InteractionPanel(props: InteractionPanelProps): JSX.Element {
  return (
    <div className="vn-interaction">
      <button
        type="button"
        className="vn-choice"
        disabled={props.busy}
        onClick={() => props.onChoose(props.options[0])}
      >
        {props.options[0]}
      </button>
      <button
        type="button"
        className="vn-choice"
        disabled={props.busy}
        onClick={() => props.onChoose(props.options[1])}
      >
        {props.options[1]}
      </button>
      <form
        className="vn-free-text"
        onSubmit={(event) => {
          event.preventDefault()
          const text = props.freeText.trim()
          if (text.length === 0 || props.busy) return
          props.onChoose(text)
        }}
      >
        <input
          value={props.freeText}
          disabled={props.busy}
          placeholder="Or type your own action…"
          onChange={(event) => props.onFreeTextChange(event.target.value)}
        />
        <button type="submit" disabled={props.busy || props.freeText.trim().length === 0}>
          Say
        </button>
      </form>
    </div>
  )
}
