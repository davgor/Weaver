import type { EngineSummary } from '../../shared/engineCatalog'

type Props = {
  engines: EngineSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function EngineRail({ engines, selectedId, onSelect }: Props) {
  return (
    <aside className="rail">
      <h2>Packages</h2>
      <ul>
        {engines.map((engine) => (
          <li key={engine.id}>
            <button
              type="button"
              className={engine.id === selectedId ? 'active' : undefined}
              onClick={() => onSelect(engine.id)}
            >
              <span className="title">{engine.title}</span>
              <span className="id">{engine.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
