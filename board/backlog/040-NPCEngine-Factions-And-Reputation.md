# EPIC: NPCEngine factions & reputation

Port the campaign social graph: factions, their relations to each other, and a character's standing with each.

**Ported from:** `board/done/125-campaign-factions-reputation-npc-membership.md`.

**Depends on:** `037-NPCEngine-Construction-And-Identity`. **Feeds:** `053-DMEngine-Turn-Routing` (reputation affects narration/pricing), `074-ElectronAITTRPG-Npc-Dossier-And-Relationship-Ui`.

## Acceptance criteria

- [ ] Faction record with membership links to NPCs
- [ ] Faction-to-faction relations (allied/neutral/hostile, or a pressure-band model) queryable for a given pair
- [ ] Per-character faction reputation score, mutated only through this package's API
- [ ] Query API returns a character's full reputation standing across all factions in one call, for DM/Narration grounding
