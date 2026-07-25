# NarrationEngine (`@weaver/narration-engine`)

LLM story invention **validated** against peer engine data.

## Role

The **only** package allowed to invent narrative prose. Before accepting story claims, it must check them against world, items, NPCs, enemies, combat (and related) facts from peer engines.

## Boundaries

- May use **LLMEngine** for generation (via orchestration paths owned with DMEngine)
- Must **not** invent durable game facts — peers own those
- Must **not** contain Electron UI
- Consumers need `*.contract.test.ts` against the real API

## Status

Scaffold. Exposes `health` plus `describeRole` documenting invent/validate responsibilities. Full design lives in epics [063](../../board/backlog/063-NarrationEngine-Scene-Social-Split-And-Streaming.md)–[066](../../board/backlog/066-NarrationEngine-Visual-Token-Generation.md).

## Public API (today)

```ts
import { narrationEngine } from '@weaver/narration-engine'

narrationEngine.health()
await narrationEngine.call('describeRole')
// → { inventsStories: true, validatesAgainst: [...], note: '...' }
```

| Export | Notes |
|--------|--------|
| `narrationEngine` | Singleton `NarrationEngineApi` |
| `NarrationEngineApi` / `EngineEndpoint` | Types |

## Planned direction (from epics 063–066)

| Epic | Intent |
|------|--------|
| [063](../../board/backlog/063-NarrationEngine-Scene-Social-Split-And-Streaming.md) | Scene/Social split + streaming; claim extraction/validation before persisting narration |
| [064](../../board/backlog/064-NarrationEngine-Tone-And-Terminology-Guards.md) | Plain-English fantasy tone; terminology scrub |
| [065](../../board/backlog/065-NarrationEngine-Rag-Retrieval.md) | RAG hybrid retrieval (lexical + local/cloud embedders) |
| [066](../../board/backlog/066-NarrationEngine-Visual-Token-Generation.md) | Visual token generation (NPC/enemy/companion/PC portraits) — this package's invention charter covers prose **and** images |

No combat damage or item creation happens here except by proposing changes that other engines apply after validating them.

## Scripts

```bash
npm test -- packages/NarrationEngine
npm run build:engines
```
