# EPIC: DMEngine travel sets CharacterEngine location

After CharacterEngine location ownership (`096`), wire DM travel so a successful `resolveTravelIntent` also updates the traveler’s placement via `setCharacterLocation`.

**Depends on:** `096-CharacterEngine-Location-Ownership`, `055-DMEngine-Commerce-And-Travel-Intents`. **Feeds:** Narration grounding, WeatherEngine sampling, hub “where am I” UI.

**Out of scope:** Pathfinding; inventing region/place ids; CharacterEngine geography validation.

## Sub-tickets

| Id | Summary |
|----|---------|
| `101.1` | Call `setCharacterLocation` from travel success path + consumer contract |

## Acceptance criteria

- [x] After successful travel intent, CharacterEngine `getCharacterLocation` reflects the destination’s opaque ids/kind
- [x] DMEngine consumer `*.contract.test.ts` exercises real CharacterEngine `setCharacterLocation`
- [x] Failures that reject travel do not mutate location

## Sub-tickets

### 101.1 Travel success sets character location

Hook DMEngine’s travel success path to CharacterEngine placement APIs.

**Parent:** `101-DMEngine-Travel-Set-Character-Location`. **Depends on:** `096`. **Origin:** deferred from `096.4`.

#### Acceptance criteria

- [x] `resolveTravelIntent` (or its caller) invokes `setCharacterLocation` with destination-derived opaque ids after a successful advance
- [x] Unit/contract tests cover success mutates location and failed destination checks do not
- [x] No CharacterEngine → World/Regional imports introduced in DM beyond existing destination lookup
