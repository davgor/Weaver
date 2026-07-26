export type D20OverlayState =
  | { phase: 'idle' }
  | { phase: 'rolling'; label: string; roll: number }
  | { phase: 'settled'; label: string; roll: number }

export type D20OverlayEvent =
  | { type: 'show'; label: string; roll: number }
  | { type: 'settle' }
  | { type: 'hide' }

export function nextD20OverlayState(
  state: D20OverlayState,
  event: D20OverlayEvent
): D20OverlayState {
  if (event.type === 'show') {
    return { phase: 'rolling', label: event.label, roll: event.roll }
  }
  if (event.type === 'hide') {
    return { phase: 'idle' }
  }
  if (state.phase === 'rolling') {
    return { phase: 'settled', label: state.label, roll: state.roll }
  }
  return state
}
