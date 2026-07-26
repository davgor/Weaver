import { useState } from 'react'
import type { BeginOnboardingRequest, CampaignSummary } from '../../shared/gameApi'
import { Titlebar } from './titlebar/Titlebar'
import { Sidebar } from './sidebar/Sidebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { EmptyMainPanel } from './mainPanel/EmptyMainPanel'
import { UpdateBanner } from './autoUpdate/UpdateBanner'
import { CharacterSheetOverlay } from './characterSheet/CharacterSheetOverlay'
import { PlayViewShell } from './characterSheet/PlayViewShell'
import { CampaignHubScreen } from './campaignHub/CampaignHubScreen'
import { PlayViewScreen } from './playView/PlayViewScreen'
import { NpcDossierOverlay } from './npcDossier/NpcDossierOverlay'
import { SettingsOverlay } from './settings/SettingsOverlay'
import { JourneyOverlays } from './app/JourneyOverlays'
import { useAppBoot } from './app/useAppBoot'
import type { JourneyStage, MainSurface } from './app/journeyTypes'
import type { LoadNpcDossierRequest } from '../../shared/npcDossier/types'

type KnownNpcLinks = Array<LoadNpcDossierRequest & { displayName: string }>

const DEMO_NPC_CAMPAIGN_ID = 'demo.campaign.npc-dossier'

function demoKnownNpcLinks(): KnownNpcLinks {
  return [
    {
      npcId: 'demo.npc.mira',
      campaignId: DEMO_NPC_CAMPAIGN_ID,
      displayName: 'Captain Mira'
    },
    {
      npcId: 'demo.npc.orren',
      campaignId: DEMO_NPC_CAMPAIGN_ID,
      displayName: 'Orren Vale'
    }
  ]
}

export function App(): JSX.Element {
  const { boot, campaigns, refreshCampaigns } = useAppBoot()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [npcDossierRequest, setNpcDossierRequest] = useState<LoadNpcDossierRequest | null>(null)
  const [journey, setJourney] = useState<JourneyStage>('idle')
  const [surface, setSurface] = useState<MainSurface>({ stage: 'empty' })
  const [onboardingRequest, setOnboardingRequest] = useState<BeginOnboardingRequest | null>(null)
  const knownNpcLinks = demoKnownNpcLinks()

  return (
    <div className="app-root">
      <Titlebar onOpenSettings={() => setSettingsOpen(true)} />
      {boot.phase !== 'ready' ? (
        <LoadingScreen boot={boot} />
      ) : (
        <ReadyAppBody
          campaigns={campaigns}
          knownNpcLinks={knownNpcLinks}
          onOpenCharacterSheet={() => setSheetOpen(true)}
          onOpenNpc={setNpcDossierRequest}
          onNewCampaign={() => setJourney('create')}
          onOpenCampaign={(campaignId) => void openCampaign(campaignId, setSurface)}
          onAddCharacter={(request) => {
            setOnboardingRequest(request)
            setJourney('onboarding')
          }}
          onPlayAs={(character) =>
            setSurface({
              stage: 'play',
              campaignId: character.campaignId,
              characterId: character.characterId,
              characterName: character.characterName
            })
          }
          surface={surface}
        />
      )}
      <SheetOverlays
        sheetOpen={sheetOpen}
        settingsOpen={settingsOpen}
        npcDossierRequest={npcDossierRequest}
        knownNpcLinks={knownNpcLinks}
        setSheetOpen={setSheetOpen}
        setSettingsOpen={setSettingsOpen}
        setNpcDossierRequest={setNpcDossierRequest}
      />
      <JourneyOverlays
        journey={journey}
        onboardingRequest={onboardingRequest}
        setJourney={setJourney}
        setOnboardingRequest={setOnboardingRequest}
        onOnboardingComplete={(request) => {
          setJourney('hub')
          setSurface({ stage: 'hub', campaignId: request.campaignId })
          void refreshCampaigns()
        }}
      />
      <UpdateBanner />
    </div>
  )
}

function SheetOverlays(props: {
  sheetOpen: boolean
  settingsOpen: boolean
  npcDossierRequest: LoadNpcDossierRequest | null
  knownNpcLinks: KnownNpcLinks
  setSheetOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setNpcDossierRequest: (request: LoadNpcDossierRequest | null) => void
}): JSX.Element {
  return (
    <>
      <CharacterSheetOverlay
        open={props.sheetOpen}
        onClose={() => props.setSheetOpen(false)}
        onOpenNpc={(npcId) =>
          props.setNpcDossierRequest({ campaignId: DEMO_NPC_CAMPAIGN_ID, npcId })
        }
      />
      <NpcDossierOverlay
        open={props.npcDossierRequest !== null}
        request={props.npcDossierRequest}
        knownPeople={props.knownNpcLinks}
        onClose={() => props.setNpcDossierRequest(null)}
        onOpenNpc={props.setNpcDossierRequest}
      />
      <SettingsOverlay open={props.settingsOpen} onClose={() => props.setSettingsOpen(false)} />
    </>
  )
}

function ReadyAppBody(props: {
  campaigns: CampaignSummary[]
  knownNpcLinks: KnownNpcLinks
  onOpenCharacterSheet: () => void
  onOpenNpc: (request: LoadNpcDossierRequest) => void
  onNewCampaign: () => void
  onOpenCampaign: (campaignId: string) => void
  onAddCharacter: (request: BeginOnboardingRequest) => void
  onPlayAs: (character: { campaignId: string; characterId: string; characterName: string }) => void
  surface: MainSurface
}): JSX.Element {
  return (
    <div className="app-body">
      <Sidebar
        campaigns={props.campaigns}
        onNewCampaign={props.onNewCampaign}
        onOpenCampaign={props.onOpenCampaign}
      />
      <PlayViewShell onOpenCharacterSheet={props.onOpenCharacterSheet}>
        <MainSurfaceView
          surface={props.surface}
          knownNpcLinks={props.knownNpcLinks}
          onOpenNpc={props.onOpenNpc}
          onAddCharacter={props.onAddCharacter}
          onPlayAs={props.onPlayAs}
        />
      </PlayViewShell>
    </div>
  )
}

function MainSurfaceView(props: {
  surface: MainSurface
  knownNpcLinks: KnownNpcLinks
  onOpenNpc: (request: LoadNpcDossierRequest) => void
  onAddCharacter: (request: BeginOnboardingRequest) => void
  onPlayAs: (character: { campaignId: string; characterId: string; characterName: string }) => void
}): JSX.Element {
  if (props.surface.stage === 'hub') {
    const campaignId = props.surface.campaignId
    return (
      <CampaignHubScreen
        campaignId={campaignId}
        onAddCharacter={props.onAddCharacter}
        onPlayAs={(character) => props.onPlayAs({ campaignId, ...character })}
      />
    )
  }
  if (props.surface.stage === 'play') {
    return <PlayViewScreen {...props.surface} />
  }
  return <EmptyMainPanel knownPeople={props.knownNpcLinks} onOpenNpc={props.onOpenNpc} />
}

async function openCampaign(
  campaignId: string,
  setSurface: (surface: MainSurface) => void
): Promise<void> {
  const result = await window.aiTtrpg.campaigns.open({ campaignId })
  setSurface(result.landing === 'hub' ? { stage: 'hub', campaignId } : { stage: 'empty' })
}
