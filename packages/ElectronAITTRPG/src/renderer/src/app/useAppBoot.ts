import { useEffect, useState } from 'react'
import type { CampaignSummary, StartupBootSnapshot } from '../../../shared/gameApi'

const BOOTING: StartupBootSnapshot = {
  phase: 'booting',
  progress: 12,
  stageLabel: 'Starting',
  statusText: 'Checking Weaver engines…',
  engineLabel: '',
  failureMessage: null
}

export function useAppBoot(): {
  boot: StartupBootSnapshot
  campaigns: CampaignSummary[]
  refreshCampaigns: () => Promise<void>
} {
  const [boot, setBoot] = useState<StartupBootSnapshot>(BOOTING)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])

  useEffect(() => {
    let cancelled = false
    async function load(): Promise<void> {
      const nextBoot = await window.aiTtrpg.startup.getBoot()
      if (cancelled) return
      setBoot(nextBoot)
      if (nextBoot.phase !== 'ready') return
      const list = await loadCampaigns()
      if (!cancelled) setCampaigns(list)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return { boot, campaigns, refreshCampaigns: async () => setCampaigns(await loadCampaigns()) }
}

function loadCampaigns(): Promise<CampaignSummary[]> {
  return window.aiTtrpg.campaigns.list()
}
