import type { BeginOnboardingRequest } from '../../../shared/gameApi'
import { CampaignStartModal } from '../campaignStart/CampaignStartModal'
import { CampaignReviewScreen } from '../campaignReview/CampaignReviewScreen'
import { OnboardingWizard } from '../onboarding/OnboardingWizard'
import type { JourneyStage } from './journeyTypes'

type JourneyOverlaysProps = {
  journey: JourneyStage
  onboardingRequest: BeginOnboardingRequest | null
  setJourney: (stage: JourneyStage) => void
  setOnboardingRequest: (request: BeginOnboardingRequest | null) => void
}

export function JourneyOverlays(props: JourneyOverlaysProps): JSX.Element {
  return (
    <>
      <CampaignStartModal
        open={props.journey === 'create'}
        onClose={() => props.setJourney('idle')}
        onReviewReady={() => props.setJourney('review')}
      />
      <CampaignReviewScreen
        open={props.journey === 'review'}
        onBack={() => props.setJourney('create')}
        onContinue={() => void continueToOnboarding(props)}
      />
      {props.onboardingRequest !== null ? (
        <OnboardingWizard
          request={props.onboardingRequest}
          onComplete={() => {
            props.setJourney('play')
            props.setOnboardingRequest(null)
          }}
        />
      ) : null}
    </>
  )
}

async function continueToOnboarding(props: {
  setJourney: (stage: JourneyStage) => void
  setOnboardingRequest: (request: BeginOnboardingRequest | null) => void
}): Promise<void> {
  await window.aiTtrpg.campaignCreate.assertCanContinue()
  const review = await window.aiTtrpg.campaignCreate.getReview()
  if (review === null) return
  props.setOnboardingRequest({
    campaignId: review.campaignId,
    characterId: `${review.campaignId}.pc1`,
    characterName: 'Adventurer'
  })
  props.setJourney('onboarding')
}
