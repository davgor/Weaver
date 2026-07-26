# ElectronAdmin (`@weaver/electron-admin`)

**AI ADMIN** — releasable Electron DEV/admin panel for Weaver.

## Role

UI + IPC for reviewing app/LLM metrics, listing engine packages, and exercising engine endpoints with returned payloads. No game business logic — call engines through their published APIs.

## Product

| Field | Value |
|-------|--------|
| Display name | AI ADMIN |
| App id | `com.davgor.weaver.admin` |
| Updater channel | `ai-admin` |
| Artifacts | NSIS + portable (Win), DMG (Mac) |

## Boundaries

- UI + IPC + packaging only
- Engine endpoint calls need consumer `*.contract.test.ts` where main/shared invoke engines
- Security baseline matches the game app (contextIsolation, sandbox, narrow IPC)

## Status (today)

Admin shell loads engine summaries, lets you select an engine, run an endpoint, and inspect the last result (including LLMEngine install/status/complete surfaces). An LLM usage dashboard aggregates metering by purpose and provider with time-range filters, shows the active local model/provider at a glance, and supports a manual backend connection check — all via LLMEngine endpoints only.

Registered engines live in `src/main/engines.ts` (also mirrored in ElectronAITTRPG `engineHealth.ts` when wiring the game app). Wave-five engines (`CharacterEngine`, `CombatEngine`, `ItemEngine`, `NPCEngine`, `EnemyEngine`, `DMEngine`, `NarrationEngine`) each expose real endpoints beyond `health` in the Admin catalog; see `engineCatalog.contract.test.ts`.

## Run & package

From repo root:

```bash
npm run admin             # ensure-dev bootstrap + this app
npm run package:win       # dual release includes this app
```

Package-local:

```bash
npm run dev
npm run build
npm run package:win
npm run package:mac
```

## Layout

| Path | Purpose |
|------|---------|
| `src/main/` | Electron main; wires engine catalog / callEndpoint |
| `src/preload/` | Admin API bridge |
| `src/renderer/` | Admin panel UI (`EngineRail`, `EndpointPanel`, ready view) |
| `src/shared/` | Branding, engine catalog types |

## Scripts (workspace)

Prefer root `npm test` / `npm run lint` / `npm run build` for verification. Package `typecheck` covers node + web tsconfigs.
