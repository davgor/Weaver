export type JourneyStage = 'idle' | 'create' | 'review' | 'onboarding' | 'hub' | 'play'

export type MainSurface =
  | { stage: 'empty' }
  | { stage: 'hub'; campaignId: string }
  | { stage: 'play'; campaignId: string; characterId: string; characterName: string }
