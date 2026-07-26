export type TerminologyReplacement = {
  readonly pattern: RegExp
  readonly replacement: string
  readonly label: string
}

/** Trademarked or D&D-specific terms rewritten in user-facing prose only. */
export const TERMINOLOGY_REPLACEMENTS: readonly TerminologyReplacement[] = [
  {
    label: 'Dungeons & Dragons',
    pattern: /\bDungeons\s*&\s*Dragons\b/gi,
    replacement: 'tabletop fantasy'
  },
  {
    label: 'D&D',
    pattern: /\bD\s*&\s*D\b/gi,
    replacement: 'tabletop fantasy'
  },
  {
    label: 'dungeon master',
    pattern: /\bdungeon\s+master\b/gi,
    replacement: 'story guide'
  },
  {
    label: 'hit points',
    pattern: /\bhit\s+points\b/gi,
    replacement: 'vitality'
  },
  {
    label: 'armor class',
    pattern: /\barmor\s+class\b/gi,
    replacement: 'warding'
  },
  {
    label: 'cantrip',
    pattern: /\bcantrips?\b/gi,
    replacement: 'minor charm'
  },
  {
    label: 'beholder',
    pattern: /\bbeholders?\b/gi,
    replacement: 'eye tyrant'
  },
  {
    label: 'mind flayer',
    pattern: /\bmind\s+flayers?\b/gi,
    replacement: 'psionic horror'
  },
  {
    label: 'balor',
    pattern: /\bbalors?\b/gi,
    replacement: 'fire demon lord'
  }
]
