import { AdminReadyView } from './AdminReadyView'
import { useAdminState } from './useAdminState'
import { APP_DISPLAY_NAME } from '../../shared/appBranding'

export function App() {
  const admin = useAdminState()

  return (
    <div className="shell">
      <header className="hero">
        <p className="brand">{APP_DISPLAY_NAME}</p>
        <h1>Admin Panel</h1>
        <p className="lede">
          Review app and LLM metrics, run test functions against engine packages, and inspect
          returned payloads in development.
        </p>
      </header>

      {admin.state === 'loading' && <p className="status">Loading engines…</p>}
      {admin.state === 'error' && <p className="status error">{admin.error}</p>}
      {admin.state === 'ready' && (
        <AdminReadyView
          engines={admin.engines}
          selected={admin.selected}
          selectedId={admin.selectedId}
          busy={admin.busy}
          error={admin.error}
          lastResult={admin.lastResult}
          onSelect={admin.onSelect}
          onRun={admin.onRun}
        />
      )}
    </div>
  )
}
