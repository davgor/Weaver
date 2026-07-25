import type { EngineCallResult, EngineSummary } from '../../shared/engineCatalog'
import { EndpointRow } from './EndpointRow'

type Props = {
  selected: EngineSummary | null
  busy: boolean
  error: string | null
  lastResult: EngineCallResult | null
  onRun: (endpoint: string, payload?: unknown) => void
}

export function EndpointPanel(props: Props) {
  if (!props.selected) {
    return (
      <main className="panel">
        <p className="status">No engines registered.</p>
      </main>
    )
  }

  return (
    <main className="panel">
      <section className="intro">
        <h2>{props.selected.title}</h2>
        <p>{props.selected.description}</p>
      </section>

      <section>
        <h3>Test functions</h3>
        <div className="endpoints">
          {props.selected.endpoints.map((endpoint) => (
            <EndpointRow key={endpoint.name} endpoint={endpoint} busy={props.busy} onRun={props.onRun} />
          ))}
        </div>
      </section>

      {props.error && <p className="status error">{props.error}</p>}

      {props.lastResult && (
        <section className="result">
          <div className="result-meta">
            <h3>Result</h3>
            <span>
              {props.lastResult.engineId}.{props.lastResult.endpoint} ·{' '}
              {props.lastResult.durationMs}ms
            </span>
          </div>
          {props.lastResult.payload !== undefined && (
            <>
              <h3>Sent</h3>
              <pre>{JSON.stringify(props.lastResult.payload, null, 2)}</pre>
            </>
          )}
          <pre>{JSON.stringify(props.lastResult.result, null, 2)}</pre>
        </section>
      )}
    </main>
  )
}
