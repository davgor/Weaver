import type { CampaignSummary } from '../../../shared/gameApi'
import './sidebar.css'

interface SidebarProps {
  campaigns: CampaignSummary[]
  onNewCampaign: () => void
  onOpenCampaign: (campaignId: string) => void
}

export function Sidebar(props: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar" aria-label="Campaigns">
      <div className="sidebar-header">Campaigns</div>
      {props.campaigns.length === 0 ? (
        <p className="sidebar-empty">No campaigns yet. Create one to generate a world and begin.</p>
      ) : (
        <ul className="sidebar-campaign-list">
          {props.campaigns.map((campaign) => (
            <li key={campaign.id}>
              <button
                type="button"
                className="sidebar-campaign-button"
                onClick={() => props.onOpenCampaign(campaign.id)}
              >
                <span className="sidebar-campaign-name">{campaign.name}</span>
                <span className="sidebar-campaign-last-played">
                  {campaign.lastPlayedAt ?? 'Never played'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="sidebar-footer">
        <button type="button" onClick={props.onNewCampaign}>
          New Campaign
        </button>
      </div>
    </aside>
  )
}
