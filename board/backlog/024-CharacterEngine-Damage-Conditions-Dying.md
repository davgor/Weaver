# EPIC: CharacterEngine damage types, conditions & dying saves

Port the damage-type and condition system so combat and narration have a single deterministic source for what a condition does mechanically, and so "unconscious" and "dying" stay distinct concepts.

**Ported from:** AI-DND-Matrix's README rules section (damage types: Physical, Fire, Cold, Poison, Arcane, with resistance/vulnerability and weapon-enchantment overlays; conditions: Prone, Stunned, Poisoned, Restrained, Unconscious via `CONDITION_EFFECTS`), plus `board/done/126-close-readme-rules-debt.md` and `board/done/131-rules-honesty-conditions-and-homebrew.md`.

**Depends on:** `021-CharacterEngine-Core-Ability-Model`, `023-CharacterEngine-Hp-Model`. **Feeds:** `034-ItemEngine-Weapon-Enchantments-And-Damage-Types` (overlay source), `049-CombatEngine-Hit-Damage-Crit-Conditions` (applies these at resolution).

## Acceptance criteria

- [ ] Five damage types with resistance/vulnerability multipliers, unit-tested
- [ ] `CONDITION_EFFECTS`-equivalent table: Prone, Stunned, Poisoned, Restrained, Unconscious, each with its concrete mechanical effect (disadvantage, auto-fail Body/Agility saves, `canAct` gating, etc.)
- [ ] Dying-save protocol is a distinct state machine from "Unconscious" — Unconscious does not auto-fail dying saves
- [ ] At 0 HP, a character enters Unconscious + starts dying saves; only losing that sequence triggers death-mode resolution (unless story-driven death is explicitly flagged elsewhere)
- [ ] All condition/damage-type logic is pure and unit-tested with no Electron/LLM imports
