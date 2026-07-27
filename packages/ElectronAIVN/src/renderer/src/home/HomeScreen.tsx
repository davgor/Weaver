import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import type { VnSavedGameSummary } from '../../../shared/story/types'
import appBrandMarkUrl from '../assets/app-icon.png'

type HomeScreenProps = {
  canTellStory: boolean
  savedGames: VnSavedGameSummary[]
  onTellStory: () => void
  onResume: (campaignId: string) => void
}

export function HomeScreen(props: HomeScreenProps): JSX.Element {
  const hasSaves = props.savedGames.length > 0
  return (
    <main className="empty-home">
      <img className="empty-home-mark" src={appBrandMarkUrl} alt="" width={96} height={96} />
      <h1 className="empty-home-brand">{APP_DISPLAY_NAME}</h1>
      <p className="empty-home-copy">{homeCopy(props.canTellStory, hasSaves)}</p>
      <button
        type="button"
        className="empty-home-cta"
        disabled={!props.canTellStory}
        onClick={props.canTellStory ? props.onTellStory : undefined}
      >
        Tell a story
      </button>
      {hasSaves ? (
        <section className="saved-games" aria-label="Saved games">
          <h2 className="saved-games-heading">Saved games</h2>
          <ul className="saved-games-list">
            {props.savedGames.map((game) => (
              <li key={game.campaignId}>
                <button
                  type="button"
                  className="saved-games-item"
                  onClick={() => props.onResume(game.campaignId)}
                >
                  <span className="saved-games-title">{game.title}</span>
                  <span className="saved-games-premise">{game.premiseSummary}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  )
}

function homeCopy(canTellStory: boolean, hasSaves: boolean): string {
  if (!canTellStory) return 'Finish local model setup to unlock Tell a story.'
  if (hasSaves) return 'Resume a saved game or tell a new story.'
  return 'Tell a story will open a short visual-novel arc.'
}
