import type { VnStoryReviewSnapshot } from '../../../shared/story/types'

/** Play stays disabled until overview is ready and explicitly confirmed. */
export function canPlayFromReview(review: VnStoryReviewSnapshot): boolean {
  return review.status === 'ready' && review.confirmed === true
}
