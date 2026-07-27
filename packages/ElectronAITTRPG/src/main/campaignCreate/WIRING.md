# Campaign create wiring (parent agent)

Epic **069** implements campaign create/review logic under `src/main/campaignCreate/` and renderer modules under `src/renderer/src/campaignStart/` + `campaignReview/`. The parent must wire IPC and `GameApi` — do **not** duplicate business logic in `main/index.ts`.

## 1. `packages/ElectronAITTRPG/src/shared/gameApi.ts`

Import shared API types:

```ts
import type { CampaignCreateApi } from './campaignCreate/types.js'
```

Add to `GameApi`:

```ts
campaignCreate: CampaignCreateApi
```

Re-export if desired:

```ts
export type {
  CampaignCreateApi,
  CampaignCreateDraft,
  CampaignReviewSnapshot,
  DeathMode,
  CampaignReviewSection,
  UpdateReviewFieldRequest,
  RegenerateSectionRequest,
  GenerateRegionNpcRequest
} from './campaignCreate/types.js'
```

## 2. `packages/ElectronAITTRPG/src/preload/index.ts`

Expose IPC bridges matching `registerCampaignCreateHandlers`:

```ts
campaignCreate: {
  startGeneration: (draft) => ipcRenderer.invoke('campaignCreate:startGeneration', draft),
  getReview: () => ipcRenderer.invoke('campaignCreate:getReview'),
  updateReviewField: (request) => ipcRenderer.invoke('campaignCreate:updateReviewField', request),
  regenerateSection: (request) => ipcRenderer.invoke('campaignCreate:regenerateSection', request),
  generateRegionNpc: (request) => ipcRenderer.invoke('campaignCreate:generateRegionNpc', request),
  confirmReview: () => ipcRenderer.invoke('campaignCreate:confirmReview'),
  assertCanContinue: () => ipcRenderer.invoke('campaignCreate:assertCanContinue')
}
```

## 3. `packages/ElectronAITTRPG/src/main/index.ts`

During main bootstrap (alongside settings / npc dossier handlers):

```ts
import { registerCampaignCreateHandlers } from './campaignCreate/registerHandlers.js'

// after app.whenReady() or existing handler registration:
registerCampaignCreateHandlers()
```

## 4. `packages/ElectronAITTRPG/src/renderer/src/App.tsx`

Suggested UI flow:

1. Empty sidebar → open `CampaignStartModal` (`open`, `onClose`, `onReviewReady`).
2. On `onReviewReady`, hide modal and show `CampaignReviewScreen`.
3. `CampaignReviewScreen` `onContinue` should call `window.aiTtrpg.campaignCreate.assertCanContinue()` before routing to character onboarding (hook already gates on `confirmed`).
4. Block onboarding routes until review `confirmed === true`.

Optional: import minimal layout classes from existing `modal-overlay` / `modal-panel` theme (no new CSS required for wiring).

## IPC channel reference

| Channel | Payload | Returns |
|---------|---------|---------|
| `campaignCreate:startGeneration` | `CampaignCreateDraft` | `CampaignReviewSnapshot` |
| `campaignCreate:getReview` | — | `CampaignReviewSnapshot \| null` |
| `campaignCreate:updateReviewField` | `UpdateReviewFieldRequest` | `CampaignReviewSnapshot` |
| `campaignCreate:regenerateSection` | `RegenerateSectionRequest` | `CampaignReviewSnapshot` |
| `campaignCreate:generateRegionNpc` | `GenerateRegionNpcRequest` | `CampaignReviewSnapshot` |
| `campaignCreate:confirmReview` | — | `CampaignReviewSnapshot` |
| `campaignCreate:assertCanContinue` | — | `void` (throws if not confirmed) |

## Generative tokens

`generativeTokensEnabled` is accepted only on `CampaignCreateDraft` at `startGeneration`. The service rejects `updateReviewField` attempts to change it mid-campaign.

Production LLM calls use the shared Settings-backed `TextCompleter` from `createGameServices()` / `createSharedSettingsServices()`:

```ts
const settings = createSharedSettingsServices()
registerCampaignCreateHandlers({
  service: createCampaignCreateService(
    createLiveGenerationPort(
      campaignsRoot,
      createLiveGenerationDeps(settings.textCompleter)
    )
  )
})
```

`createLiveGenerationDeps(completer)` requires an explicit completer — there is no silent scripted default on the production path. Deterministic contract/unit tests pass `scriptedCampaignCompleter()` instead.

`deathMode` is stored on the draft/review snapshot for the parent to apply via CharacterEngine (`setCampaignDeathMode`) when persisting the campaign after confirmation.
