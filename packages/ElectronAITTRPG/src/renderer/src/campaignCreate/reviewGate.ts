export function canEnterOnboarding(confirmed: boolean): boolean {
  return confirmed
}

export function assertReviewConfirmed(confirmed: boolean): void {
  if (!canEnterOnboarding(confirmed)) {
    throw new Error('Campaign review must be confirmed before continuing to onboarding')
  }
}
