export type CampaignSummary = {
  id: string
  name: string
  lastPlayedAt: string | null
}

export type StartupBootSnapshot = {
  phase: 'booting' | 'ready' | 'failed'
  progress: number
  stageLabel: string
  statusText: string
  engineLabel: string
  failureMessage: string | null
}

export type GameApi = {
  windowControls: {
    minimize: () => void
    maximize: () => void
    close: () => void
  }
  startup: {
    getBoot: () => Promise<StartupBootSnapshot>
  }
  campaigns: {
    list: () => Promise<CampaignSummary[]>
  }
  app: {
    getVersion: () => Promise<string>
  }
}
