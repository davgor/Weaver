import type { VnStoryReviewSnapshot } from '../../../shared/story/types'

type StoryReviewBodyProps = {
  review: VnStoryReviewSnapshot
  busy: boolean
  onConfirm: () => void
}

export function StoryReviewBody(props: StoryReviewBodyProps): JSX.Element {
  const { review } = props
  if (review.errorMessage) {
    return <p className="tell-story-error">{review.errorMessage}</p>
  }
  return (
    <div className="story-review">
      <p className="story-review-prose">{review.overviewProse}</p>
      <p>
        <strong>Premise:</strong> {review.premiseSummary}
      </p>
      <p>
        <strong>Main character:</strong> {review.mainCharacter.name} —{' '}
        {review.mainCharacter.personality}; {review.mainCharacter.appearance}
      </p>
      <ActsList acts={review.acts} />
      <CastList cast={review.cast} />
      <p>
        <strong>Opening:</strong> {review.openingBeat}
      </p>
      <label className="story-review-confirm">
        <input
          type="checkbox"
          checked={review.confirmed}
          disabled={props.busy || review.status !== 'ready'}
          onChange={(event) => {
            if (event.target.checked) props.onConfirm()
          }}
        />
        I have reviewed this overview
      </label>
    </div>
  )
}

function ActsList(props: { acts: VnStoryReviewSnapshot['acts'] }): JSX.Element {
  return (
    <section>
      <h3>Acts</h3>
      <ol>
        {props.acts.map((act) => (
          <li key={act.actIndex}>
            <strong>{act.title}</strong> — {act.summary}
          </li>
        ))}
      </ol>
    </section>
  )
}

function CastList(props: { cast: VnStoryReviewSnapshot['cast'] }): JSX.Element {
  return (
    <section>
      <h3>Cast</h3>
      <ul>
        {props.cast.map((member) => (
          <li key={member.npcId}>
            {member.displayName} ({member.role})
          </li>
        ))}
      </ul>
    </section>
  )
}
