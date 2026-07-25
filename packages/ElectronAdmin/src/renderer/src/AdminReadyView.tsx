import type { EngineCallResult, EngineSummary } from '../../shared/engineCatalog'
import { EngineRail } from './EngineRail'
import { EndpointPanel } from './EndpointPanel'

type Props = {
  engines: EngineSummary[]
  selected: EngineSummary | null
  selectedId: string | null
  busy: boolean
  error: string | null
  lastResult: EngineCallResult | null
  onSelect: (id: string) => void
  onRun: (endpoint: string, payload?: unknown) => void
}

export function AdminReadyView(props: Props) {
  return (
    <div className="layout">
      <EngineRail
        engines={props.engines}
        selectedId={props.selectedId}
        onSelect={props.onSelect}
      />
      <EndpointPanel
        selected={props.selected}
        busy={props.busy}
        error={props.error}
        lastResult={props.lastResult}
        onRun={props.onRun}
      />
    </div>
  )
}
