export function incomingGlowIds(
  previousIds: readonly string[],
  nextIds: readonly string[]
): string[] {
  const previous = new Set(previousIds)
  return nextIds.filter((id) => !previous.has(id))
}
