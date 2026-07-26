const MECHANICAL_DECISION_PATTERN =
  /\b(?:body|agility|mind|presence|strength|dexterity|constitution|intelligence|wisdom|charisma|hp|ac|level)\b\s*(?:score|stat|is|:|=)?\s*-?\d+/i

export function mechanicalDecisionErrors(prose: string): string[] {
  return MECHANICAL_DECISION_PATTERN.test(prose)
    ? ['No mechanical stats are decided by guided identity chat.']
    : []
}
