# REBUILD_SPEC domain SPEC index

`REBUILD_SPEC.md` was carried forward from a monolith-era tree that referenced
`src/**/SPEC.md` files. In this Weaver monorepo there are zero `SPEC.md` files
under `packages/`; living contracts now live in package READMEs, package tests,
and board epics.

Use this index when a historical SPEC path appears in `REBUILD_SPEC.md`.

| Historical path | Exists in Weaver? | Status | Replacement |
|-----------------|-------------------|--------|-------------|
| `src/shared/combat/SPEC.md` | No | Replaced | [CombatEngine README](../../CombatEngine/README.md), [048](../../../board/done/048-CombatEngine-Encounter-Lifecycle.md), [049](../../../board/done/049-CombatEngine-Hit-Damage-Crit-Conditions.md), [050](../../../board/done/050-CombatEngine-Flee-Surrender-Nonlethal.md), [051](../../../board/done/051-CombatEngine-Dynamic-Start-And-Triggers.md) |
| `src/shared/combat/flee/SPEC.md` | No | Replaced | [050](../../../board/done/050-CombatEngine-Flee-Surrender-Nonlethal.md) |
| `src/shared/turnRouting/SPEC.md` | No | Replaced | [DMEngine README](../../DMEngine/README.md), [053](../../../board/done/053-DMEngine-Turn-Routing.md) |
| `src/shared/campaignHub/SPEC.md` | No | Replaced | `packages/ElectronAITTRPG/src/main/campaignHub/`, `packages/ElectronAITTRPG/src/renderer/src/campaignHub/`, [058](../../../board/done/058-DMEngine-Shared-Time-And-Hub-Recap.md), [109](../../../board/backlog/109-ElectronAITTRPG-Durable-Onboarding-And-Hub.md) |
| `src/shared/playResilience/SPEC.md` | No | Replaced | `packages/ElectronAITTRPG/src/renderer/src/playView/`, `packages/ElectronAITTRPG/src/main/play/` |
| `src/shared/playPopulation/SPEC.md` | No | Replaced | [054](../../../board/done/054-DMEngine-World-Mutations-And-Live-Population.md), [116](../../../board/backlog/116-DMEngine-Live-Population-Production.md) |
| `src/shared/worldMutations/SPEC.md` | No | Replaced | [054](../../../board/done/054-DMEngine-World-Mutations-And-Live-Population.md) |
| `src/shared/sharedTime/SPEC.md` | No | Replaced | [058](../../../board/done/058-DMEngine-Shared-Time-And-Hub-Recap.md) |
| `src/shared/commerceTravel/SPEC.md` | No | Replaced | [DMEngine README](../../DMEngine/README.md), [055](../../../board/done/055-DMEngine-Commerce-And-Travel-Intents.md) |
| `src/shared/factions/SPEC.md` | No | Replaced | [NPCEngine README](../../NPCEngine/README.md), [040](../../../board/done/040-NPCEngine-Factions-And-Reputation.md) |
| `src/shared/npcDossier/SPEC.md` | No | Replaced | [042](../../../board/done/042-NPCEngine-Dossier-Model.md) |
| `src/shared/npcRelationships/SPEC.md` | No | Replaced | [041](../../../board/done/041-NPCEngine-Relationship-Web.md) |
| `src/shared/npcCombat/SPEC.md` | No | Replaced | [039](../../../board/done/039-NPCEngine-Attackable-Civilian-Combat-Disposition.md) |
| `src/shared/npcFaceTokens/SPEC.md` | No | Replaced | [044](../../../board/done/044-NPCEngine-Face-Token-Hook.md), [NarrationEngine README](../../NarrationEngine/README.md) |
| `src/shared/creatureTokens/SPEC.md` | No | Replaced | [047](../../../board/done/047-EnemyEngine-Combat-Token-Hook.md), [NarrationEngine README](../../NarrationEngine/README.md) |
| `src/shared/playerCharacterIcons/SPEC.md` | No | Replaced | [NarrationEngine README](../../NarrationEngine/README.md) portrait rails |
| `src/shared/partyMembers/SPEC.md` | No | Replaced | [030](../../../board/done/030-CharacterEngine-Companions-And-Inactive-Proxy.md) |
| `src/shared/bestiary/SPEC.md` | No | Replaced | [EnemyEngine README](../../EnemyEngine/README.md), [045](../../../board/done/045-EnemyEngine-Bestiary-Catalog.md), [046](../../../board/done/046-EnemyEngine-Dynamic-Foe-Generation.md) |
| `src/shared/quests/SPEC.md` | No | Replaced | [QuestEngine README](../../QuestEngine/README.md), [056](../../../board/done/056-DMEngine-Quest-Proposal-And-Tracking.md) |
| `src/shared/journal/SPEC.md` | No | Replaced | [CharacterEngine README](../../CharacterEngine/README.md), [028](../../../board/done/028-CharacterEngine-Journal-Logbook-Quests-Spellbook.md) |
| `src/shared/items/SPEC.md` | No | Replaced | [ItemEngine README](../../ItemEngine/README.md), [032](../../../board/done/032-ItemEngine-Item-Model-And-Inventory.md), [033](../../../board/done/033-ItemEngine-Currency-And-Economy.md), [034](../../../board/done/034-ItemEngine-Weapon-Enchantments-And-Damage-Types.md), [035](../../../board/done/035-ItemEngine-Loot-Generation.md), [036](../../../board/done/036-ItemEngine-Starting-Gear-Catalog.md) |
| `src/shared/loot/SPEC.md` | No | Replaced | [035](../../../board/done/035-ItemEngine-Loot-Generation.md) |
| `src/shared/spells/SPEC.md` | No | Replaced | [ActionEngine README](../../ActionEngine/README.md); spells are ActionEngine actions |
| `src/shared/progression/SPEC.md` | No | Replaced | [CharacterEngine README](../../CharacterEngine/README.md), [025](../../../board/done/025-CharacterEngine-Xp-And-Level-Up.md) |
| `src/shared/llmUsage/SPEC.md` | No | Replaced | [LLMEngine README](../../LLMEngine/README.md), [077](../../../board/done/077-ElectronAdmin-Llm-Usage-Dashboard.md) |
| `src/shared/campaignPortability/SPEC.md` | No | Replaced | [059](../../../board/done/059-DMEngine-Campaign-Portability.md), [108](../../../board/backlog/108-Repo-Full-Campaign-Portability-Slices.md) |
| `src/shared/sessionRecap/SPEC.md` | No | Replaced | [058](../../../board/done/058-DMEngine-Shared-Time-And-Hub-Recap.md) |
| `src/shared/weaponModifications/SPEC.md` | No | Replaced | [034](../../../board/done/034-ItemEngine-Weapon-Enchantments-And-Damage-Types.md) |
| `src/shared/rulesDebt/SPEC.md` | No | Obsolete | Dropped monolith rules-debt placeholder; do not recreate. |
| `src/shared/rulesHonesty/SPEC.md` | No | Obsolete | Dropped monolith rules-honesty placeholder; do not recreate. |
| `src/db/rag/SPEC.md` | No | Replaced | `packages/NarrationEngine/src/rag/`, [065](../../../board/done/065-NarrationEngine-Rag-Retrieval.md), [111](../../../board/backlog/111-DMEngine-Live-Rag-And-Context-Integration.md) |
| `src/engine/hp/SPEC.md` | No | Replaced | [CharacterEngine README](../../CharacterEngine/README.md), [023](../../../board/done/023-CharacterEngine-Hp-Model.md) |
| `src/engine/startingLoadout/SPEC.md` | No | Replaced | [ItemEngine README](../../ItemEngine/README.md), [036](../../../board/done/036-ItemEngine-Starting-Gear-Catalog.md) |
| `src/engine/raceSelection/SPEC.md` | No | Replaced | [029](../../../board/done/029-CharacterEngine-Race-And-Background-Selection.md) |
| `src/shared/inCampaignLayout/*_SPEC.md` | No | Replaced | Electron renderer modules under `packages/ElectronAITTRPG/src/renderer/src/` |
| `docs/terminology/ttrpg-replacement-map.md` | No | Replaced | `packages/NarrationEngine/src/terminologyMap.ts` and `npm run terminology:check` |
