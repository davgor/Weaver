# Shared campaign time and multi-PC turn policy

## Shared day counter

All player characters in a campaign read the same day counter through CharacterEngine's
`getCampaignDay(campaignId)`. Travel and long rests mutate that single counter so every PC
experiences the same calendar.

## Causal event timeline

Each campaign owns one append-only causal timeline. Events record who acted (`actorCharacterId`),
what happened (`kind`, `summary`), the shared `day`, a monotonic `seq`, and wall-clock `at`.

PC B's later scenes can query `listEventsSince` (or the full timeline) to see actions PC A
recorded earlier — causality is campaign-wide, not per-character.

## Turn order (multi-PC)

**Policy: per-PC async turns with causal ordering — not round-robin campaign locks.**

- Each active PC may take turns on their own schedule (async play). No global "whose turn is it"
  mutex blocks the whole campaign.
- When reconciling history, order events by **day → seq → at** (`compareCausalOrder`). `seq` is
  assigned at append time so simultaneous-day actions have a stable total order.
- The DM/hub surfaces cross-PC effects through the shared timeline and session recap, not by
  forcing strict alternating turns.

This prevents turn-order gaming (e.g. waiting for another PC to lock in before acting) while
still giving every scene a consistent causal past.

## Session recap

`buildSessionRecap` is a **pure function** over `(events, lastSessionAt, characterId)`. It
filters events after the PC's cursor, formats deterministic template sentences, and can be
re-run anytime the event log or cursor changes — no stale one-shot summaries.
