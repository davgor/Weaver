import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import type { LoadNpcDossierRequest } from '../../../shared/npcDossier/types'
import { PersonLinksText } from '../npcDossier/PersonLinksText'

type KnownNpcLink = LoadNpcDossierRequest & {
  displayName: string
}

type EmptyMainPanelProps = {
  knownPeople: readonly KnownNpcLink[]
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}

export function EmptyMainPanel(props: EmptyMainPanelProps): JSX.Element {
  return (
    <main className="main-panel">
      <div className="main-panel-empty">
        <p className="brand">{APP_DISPLAY_NAME}</p>
        <h1>Begin a campaign</h1>
        <p>
          Select a campaign from the rail, or create one when campaign flows are wired to Weaver
          engines. This shell mirrors the AI-DND-Matrix UI chrome.
        </p>
        <p>
          Scene demo:{' '}
          <PersonLinksText
            text="Captain Mira warned that Orren Vale knows more than he admits."
            people={props.knownPeople}
            onOpenNpc={props.onOpenNpc}
          />
        </p>
      </div>
    </main>
  )
}
