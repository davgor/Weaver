import { APP_DISPLAY_NAME } from '../../../shared/appBranding'

export function EmptyMainPanel(): JSX.Element {
  return (
    <main className="main-panel">
      <div className="main-panel-empty">
        <p className="brand">{APP_DISPLAY_NAME}</p>
        <h1>Begin a campaign</h1>
        <p>
          Select a campaign from the rail, or create one when campaign flows are wired to Weaver
          engines. This shell mirrors the AI-DND-Matrix UI chrome.
        </p>
      </div>
    </main>
  )
}
