import { useState } from 'react'
import type { EngineEndpoint } from '../../shared/engineCatalog'

type Props = {
  endpoint: EngineEndpoint
  busy: boolean
  onRun: (endpoint: string, payload?: unknown) => void
}

export function EndpointRow({ endpoint, busy, onRun }: Props) {
  const [payloadText, setPayloadText] = useState('')
  const [error, setError] = useState('')

  function run() {
    const raw = payloadText.trim()
    if (raw === '') {
      setError('')
      onRun(endpoint.name)
      return
    }
    try {
      const parsed: unknown = JSON.parse(raw)
      setError('')
      onRun(endpoint.name, parsed)
    } catch {
      setError('Invalid JSON — not sent')
    }
  }

  return (
    <div className="endpoint">
      <div className="endpoint-header">
        <strong>{endpoint.name}</strong>
        <span>{endpoint.description}</span>
      </div>
      <textarea
        aria-label={`${endpoint.name} payload (JSON, optional)`}
        placeholder="Optional JSON payload"
        rows={2}
        value={payloadText}
        disabled={busy}
        onChange={(event) => setPayloadText(event.target.value)}
      />
      <div className="endpoint-actions">
        {error && <span className="status error">{error}</span>}
        <button type="button" disabled={busy} onClick={run}>
          Run
        </button>
      </div>
    </div>
  )
}
