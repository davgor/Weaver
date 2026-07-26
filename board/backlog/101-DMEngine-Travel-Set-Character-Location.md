# EPIC: DMEngine travel sets CharacterEngine location

After CharacterEngine location ownership (`096`), wire DM travel so a successful `resolveTravelIntent` also updates the traveler’s placement via `setCharacterLocation`.

**Depends on:** `096-CharacterEngine-Location-Ownership`, `055-DMEngine-Commerce-And-Travel-Intents`. **Feeds:** Narration grounding, WeatherEngine sampling, hub “where am I” UI.

**Out of scope:** Pathfinding; inventing region/place ids; CharacterEngine geography validation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `101.1` | Call `setCharacterLocation` from travel success path + consumer contract |

## Acceptance criteria

- [ ] After successful travel intent, CharacterEngine `getCharacterLocation` reflects the destination’s opaque ids/kind
- [ ] DMEngine consumer `*.contract.test.ts` exercises real CharacterEngine `setCharacterLocation`
- [ ] Failures that reject travel do not mutate location
