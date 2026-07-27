import { APP_DISPLAY_NAME } from '../../../shared/appBranding'
import appBrandMarkUrl from '../assets/app-icon.png'

type EmptyHomeProps = {
  canTellStory: boolean
}

export function EmptyHome(props: EmptyHomeProps): JSX.Element {
  return (
    <main className="empty-home">
      <img className="empty-home-mark" src={appBrandMarkUrl} alt="" width={96} height={96} />
      <h1 className="empty-home-brand">{APP_DISPLAY_NAME}</h1>
      <p className="empty-home-copy">
        {props.canTellStory
          ? 'Tell a story will open a short visual-novel arc.'
          : 'Finish local model setup to unlock Tell a story.'}
      </p>
      <button type="button" className="empty-home-cta" disabled={!props.canTellStory}>
        Tell a story
      </button>
    </main>
  )
}
