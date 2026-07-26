import type { CausalEvent } from './types.js'

/** Per-PC async turns: each character acts independently; causal order is day → seq → at. */
export function compareCausalOrder(left: CausalEvent, right: CausalEvent): number {
  if (left.day !== right.day) {
    return left.day - right.day
  }
  if (left.seq !== right.seq) {
    return left.seq - right.seq
  }
  if (left.at !== right.at) {
    return left.at - right.at
  }
  return left.id.localeCompare(right.id)
}

export function sortEventsByCausalOrder(events: readonly CausalEvent[]): CausalEvent[] {
  return [...events].sort(compareCausalOrder)
}
