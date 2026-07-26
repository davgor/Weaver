import { useEffect, useState } from 'react'
import type { CampaignHubSnapshot } from '../../../shared/campaignHub/types'

export function useCampaignHub(campaignId: string): {
  hub: CampaignHubSnapshot | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
} {
  const [hub, setHub] = useState<CampaignHubSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setHub(await window.aiTtrpg.campaignHub.load(campaignId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load campaign hub')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [campaignId])

  return { hub, loading, error, reload }
}
