import type { BeginOnboardingRequest } from '../../../shared/onboarding/types'
import type { CampaignHubCharacter, CampaignWorldPreview } from '../../../shared/campaignHub/types'
import { useCampaignHub } from './useCampaignHub'
import './campaignHub.css'

type CampaignHubScreenProps = {
  campaignId: string
  onPlayAs: (character: { characterId: string; characterName: string }) => void
  onAddCharacter: (request: BeginOnboardingRequest) => void
}

export function CampaignHubScreen(props: CampaignHubScreenProps): JSX.Element {
  const hub = useCampaignHub(props.campaignId)

  if (hub.loading) return <main className="main-panel campaign-hub">Loading campaign hub...</main>
  if (hub.error !== null) return <main className="main-panel campaign-hub">{hub.error}</main>
  if (hub.hub === null) return <main className="main-panel campaign-hub">Campaign hub unavailable.</main>

  return (
    <main className="main-panel campaign-hub">
      <WorldPreview preview={hub.hub.worldPreview} />
      <section className="campaign-hub-cast" aria-label="Player characters">
        <header className="campaign-hub-section-header">
          <h2>Cast</h2>
          <button type="button" onClick={() => void addCharacter(props.campaignId, props.onAddCharacter)}>
            Add another character
          </button>
        </header>
        <div className="campaign-hub-cast-grid">
          {hub.hub.characters.map((character) => (
            <CharacterCard key={character.characterId} character={character} onPlayAs={props.onPlayAs} />
          ))}
        </div>
      </section>
    </main>
  )
}

function WorldPreview(props: { preview: CampaignWorldPreview }): JSX.Element {
  return (
    <section className="campaign-hub-world">
      <p className="campaign-hub-eyebrow">Campaign hub</p>
      <h1>{props.preview.campaignName}</h1>
      <p>{props.preview.summary}</p>
      <div className="campaign-hub-world-lists">
        <PreviewList title="Regions" items={props.preview.regions.map((region) => region.displayName)} />
        <PreviewList title="Known faces" items={props.preview.npcs.map((npc) => npc.displayName)} />
      </div>
    </section>
  )
}

function PreviewList(props: { title: string; items: string[] }): JSX.Element {
  return (
    <div>
      <h2>{props.title}</h2>
      <ul>
        {props.items.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function CharacterCard(props: {
  character: CampaignHubCharacter
  onPlayAs: (character: { characterId: string; characterName: string }) => void
}): JSX.Element {
  const character = props.character
  return (
    <article className="campaign-hub-character">
      <h3>{character.characterName}</h3>
      <p className="campaign-hub-character-meta">
        {character.companions.length === 0
          ? 'Travels alone'
          : `Companions: ${character.companions.map((companion) => companion.name).join(', ')}`}
      </p>
      <Recap paragraphs={character.recap.paragraphs} />
      <button type="button" onClick={() => props.onPlayAs(character)}>
        Play as {character.characterName}
      </button>
    </article>
  )
}

function Recap(props: { paragraphs: string[] }): JSX.Element {
  return (
    <div className="campaign-hub-recap">
      <h2>Session recap</h2>
      {props.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  )
}

async function addCharacter(
  campaignId: string,
  onAddCharacter: (request: BeginOnboardingRequest) => void
): Promise<void> {
  onAddCharacter(await window.aiTtrpg.campaignHub.addCharacter(campaignId))
}
