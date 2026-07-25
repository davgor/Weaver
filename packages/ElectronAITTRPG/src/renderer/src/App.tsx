import { useEffect, useState } from 'react'
import type { CampaignSummary, StartupBootSnapshot } from '../../shared/gameApi'
import { Titlebar } from './titlebar/Titlebar'
import { Sidebar } from './sidebar/Sidebar'
import { LoadingScreen } from './startup/LoadingScreen'
import { EmptyMainPanel } from './mainPanel/EmptyMainPanel'
import { UpdateBanner } from './autoUpdate/UpdateBanner'

const BOOTING: StartupBootSnapshot = {
  phase: 'booting',
  progress: 12,
  stageLabel: 'Starting',
  statusText: 'Checking Weaver engines…',
  engineLabel: '',
  failureMessage: null
}

export function App(): JSX.Element {
  const [boot, setBoot] = useState<StartupBootSnapshot>(BOOTING)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      const nextBoot = await window.aiTtrpg.startup.getBoot()
      if (cancelled) return
      setBoot(nextBoot)
      if (nextBoot.phase !== 'ready') return
      const list = await window.aiTtrpg.campaigns.list()
      if (!cancelled) setCampaigns(list)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="app-root">
      <Titlebar />
      {boot.phase !== 'ready' ? (
        <LoadingScreen boot={boot} />
      ) : (
        <div className="app-body">
          <Sidebar campaigns={campaigns} />
          <EmptyMainPanel />
        </div>
      )}
      <UpdateBanner />
    </div>
  )
}
