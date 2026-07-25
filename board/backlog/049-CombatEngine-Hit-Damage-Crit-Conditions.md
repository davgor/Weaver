# EPIC: CombatEngine hit/damage/crit resolution & condition application

Port the actual attack-resolution math: hit checks, critical hits, damage application against resistances, and condition application mid-combat.

**Ported from:** AI-DND-Matrix's README combat/damage rules ("Crits: natural 20 doubles damage dice"; conditions applied "at check/attack/save resolution").

**Depends on:** `048-CombatEngine-Encounter-Lifecycle`, `024-CharacterEngine-Damage-Conditions-Dying` (damage types + condition table), `034-ItemEngine-Weapon-Enchantments-And-Damage-Types` (weapon damage source).

## Acceptance criteria

- [ ] Attack resolution: `d20 + mod (+ proficiency) vs AC`, natural 20 doubles damage dice, natural 1 handling defined
- [ ] Damage application reads damage type + amount from the attacking item/ability (via ItemEngine) and applies target resistance/vulnerability from `024`
- [ ] Conditions (Prone, Stunned, Poisoned, Restrained, Unconscious) are applied at the moment of resolution, using the `CONDITION_EFFECTS`-equivalent table from `024` rather than a second copy of condition logic
- [ ] Reaching 0 HP transitions the combatant to Unconscious + dying-save state (per `027-CharacterEngine-Death-Modes-And-Obituary`), not straight to dead
- [ ] All resolution math is pure and unit-tested with fixed RNG seeds for deterministic test assertions
- [ ] This package's consumption of `024-CharacterEngine-Damage-Conditions-Dying` and `034-ItemEngine-Weapon-Enchantments-And-Damage-Types` is each covered by a `*.contract.test.ts` here against their real published APIs — resistance/vulnerability and enchantment data is read, never duplicated locally
