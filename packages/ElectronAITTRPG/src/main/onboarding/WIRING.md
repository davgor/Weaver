# Onboarding IPC wiring (parent integration)

Wire these handlers from `main/index.ts` and expose them on `GameApi.onboarding` in `preload/index.ts` + `shared/gameApi.ts`.

## Main process

```ts
import { registerOnboardingHandlers } from './onboarding/registerHandlers.js'

registerOnboardingHandlers()
```

## Preload bridge

Map each channel to `ipcRenderer.invoke`:

| IPC channel | `GameApi.onboarding` method |
|-------------|----------------------------|
| `onboarding:begin` | `begin` |
| `onboarding:getState` | `getState` |
| `onboarding:saveMechanicalSetup` | `saveMechanicalSetup` |
| `onboarding:saveRace` | `saveRace` |
| `onboarding:saveBackground` | `saveBackground` |
| `onboarding:saveEquipment` | `saveEquipment` |
| `onboarding:saveCompanions` | `saveCompanions` |
| `onboarding:startGuidedIdentity` | `startGuidedIdentity` |
| `onboarding:submitGuidedIdentity` | `submitGuidedIdentity` |
| `onboarding:generateOpeningScene` | `generateOpeningScene` |
| `onboarding:confirmOpeningScene` | `confirmOpeningScene` |
| `onboarding:goBack` | `goBack` |
| `onboarding:listArchetypes` | `listArchetypes` |
| `onboarding:listRaces` | `listRaces` |
| `onboarding:listBackgrounds` | `listBackgrounds` |
| `onboarding:rollAbilityScores` | `rollAbilityScores` |

## Shared types

Add to `GameApi`:

```ts
import type { OnboardingApi } from './onboarding/types.js'

export type GameApi = {
  // ...
  onboarding: OnboardingApi
}
```

Request/response shapes live in `shared/onboarding/types.ts`.

## Renderer gate

Mount `OnboardingWizard` until `canEnterPlay(snapshot.phase)` is true (`wizardPhase.ts`). Do not render `PlayViewShell` for incomplete characters.

## Engine boundaries

- CharacterEngine: mechanical setup, race, background, equipment, companions
- DMEngine: guided identity chat, opening scene generation/confirmation
- Legacy “AI Party Members” UI stays removed; companions use the dedicated post-equipment step only
