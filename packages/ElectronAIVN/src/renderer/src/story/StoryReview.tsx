import { FirstRunIntroShell } from '@weaver/electron-ui'
import type { VnStoryReviewSnapshot } from '../../../shared/story/types'
import { canPlayFromReview } from './reviewGate'
import { StoryReviewBody } from './StoryReviewBody'

type StoryReviewProps = {
  review: VnStoryReviewSnapshot
  onConfirm: () => void
  onPlay: () => void
  onBackToEdit: () => void
  busy: boolean
}

export function StoryReview(props: StoryReviewProps): JSX.Element {
  const playEnabled = canPlayFromReview(props.review) && !props.busy
  return (
    <FirstRunIntroShell
      title="Review your story"
      lead="Confirm the overview before Play. Play marks the game permanent and opens the visual novel."
      primaryAction={{
        label: props.busy ? 'Opening…' : 'Play',
        onClick: props.onPlay,
        disabled: !playEnabled
      }}
      secondaryAction={{
        label: 'Back to edit',
        onClick: props.onBackToEdit,
        disabled: props.busy
      }}
      stepContent={
        <StoryReviewBody
          review={props.review}
          busy={props.busy}
          onConfirm={props.onConfirm}
        />
      }
    />
  )
}
