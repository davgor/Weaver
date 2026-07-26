import { useState } from 'react'
import type { BeginOnboardingRequest, CampaignSummary } from '../../shared/gameApi'
import { Titlebar } from './titlebar/Titlebar'
import { Sidebar } from './sidebar/Sidebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { EmptyMainPanel } from './mainPanel/EmptyMainPanel'
import { UpdateBanner } from './autoUpdate/UpdateBanner'
import { CharacterSheetOverlay } from './characterSheet/CharacterSheetOverlay'
import { PlayViewShell } from './characterSheet/PlayViewShell'
import { NpcDossierOverlay } from './npcDossier/NpcDossierOverlay'
import { SettingsOverlay } from './settings/SettingsOverlay'
import { JourneyOverlays } from './app/JourneyOverlays'
import { useAppBoot } from './app/useAppBoot'
import type { JourneyStage } from './app/journeyTypes'
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
  const { boot, campaigns } = useAppBoot()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [npcDossierRequest, setNpcDossierRequest] = useState<LoadNpcDossierRequest | null>(null)
  const [journey, setJourney] = useState<JourneyStage>('idle')
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
}): JSX.Element {
  return (
    <div className="app-body">
      <Sidebar campaigns={props.campaigns} onNewCampaign={props.onNewCampaign} />
      <PlayViewShell onOpenCharacterSheet={props.onOpenCharacterSheet}>
        <EmptyMainPanel knownPeople={props.knownNpcLinks} onOpenNpc={props.onOpenNpc} />
      </PlayViewShell>
    </div>
  )
}
