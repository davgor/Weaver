# NarrationEngine (`@weaver/narration-engine`)

LLM story and visual-token invention **validated** against peer engine data.

## Role

The **only** package allowed to invent narrative prose or generated portrait tokens. Before accepting story claims or portrait prompts, it must check them against world, items, NPCs, enemies, combat (and related) facts from peer engines.

## Boundaries

- May use **LLMEngine** for generation (via injected `completeText` peers)
- Owns provider-agnostic NPC/enemy/companion/PC portrait generation rails
- Owns Social (player/NPC dialogue, streaming) vs Scene (DM exposition) projections
- Must **not** invent durable game facts — peers own those
- Must **not** contain Electron UI
- Consumers need `*.contract.test.ts` against the real API
- Social/Scene projections default to in-memory for unit tests. Production play
  binds campaign-scoped SQLite projection stores via DMEngine campaign sessions
  ([106](../../board/done/106-DMEngine-Production-Campaign-Stores.md));
  live RAG wiring is tracked separately in
  [111](../../board/backlog/111-DMEngine-Live-Rag-And-Context-Integration.md)

## Status

Exposes health, role description, portrait rails, and prose APIs: `projectSocial` / `projectScene`, `recordPlayerSocial`, `streamSocial`, `generateScene`, `decideSilentResolve`, plus claim extract/validate. Prose is accepted only after peer claim checks; contradicted drafts are rewritten once or rejected. Low-stakes quiet turns resolve silently.

## Public API

```ts
import { generateScene, narrationEngine, streamSocial } from '@weaver/narration-engine'

narrationEngine.health()
await narrationEngine.call('describeRole')

for await (const event of streamSocial(
  { prompt: 'Mira replies.', speakerId: 'npc-mira', kind: 'npc', interest },
  peers
)) {
  // incremental Social chunks, or { type: 'silent' }
}

await generateScene({ prompt: 'Describe the courtyard.' }, peers)
```

| Export | Notes |
|--------|--------|
| `narrationEngine` | Singleton `NarrationEngineApi` |
| `projectSocial` / `projectScene` | Independent persisted projections |
| `streamSocial` / `generateScene` | Invent + validate + persist (or silent/reject) |
| `recordPlayerSocial` | Player lines into Social without LLM |
| `decideSilentResolve` | Low-stakes quiet-turn gate |
| `extractClaims` / `validateClaims` | Labeled-block claim extract + peer checks |
| `generatePortrait` / `setManualPortrait` | Visual token rails |
| Peer types (`NarrationPeers`, …) | Injected LLM/NPC/item/location lookups |

No combat damage or item creation happens here except by proposing changes that other engines apply after validating them.

## Scripts

```bash
npm test -- packages/NarrationEngine
npm run build:engines
```
