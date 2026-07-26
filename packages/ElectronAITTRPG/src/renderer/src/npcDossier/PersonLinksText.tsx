import { segmentPersonLinks } from './personLinks'

type PersonLinksTextProps = {
  text: string
  people: ReadonlyArray<{ npcId: string; campaignId: string; displayName: string }>
  onOpenNpc: (request: { campaignId: string; npcId: string }) => void
}

export function PersonLinksText(props: PersonLinksTextProps): JSX.Element {
  const segments = segmentPersonLinks(props.text, props.people)
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') return <span key={`text-${index}`}>{segment.text}</span>
        return (
          <button
            key={`${segment.person.npcId}-${index}`}
            type="button"
            className="person-link-text-button"
            onClick={() =>
              props.onOpenNpc({
                campaignId: segment.person.campaignId,
                npcId: segment.person.npcId
              })
            }
          >
            {segment.text}
          </button>
        )
      })}
    </>
  )
}
