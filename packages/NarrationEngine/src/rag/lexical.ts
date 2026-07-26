export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter((token) => token.length > 1)
}

export function scoreLexical(query: string, text: string): number {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) {
    return 0
  }

  const textTokens = new Set(tokenize(text))
  let hits = 0
  for (const token of queryTokens) {
    if (textTokens.has(token)) {
      hits += 1
    }
  }

  const coverage = hits / queryTokens.length
  const phraseBonus = text.toLowerCase().includes(query.toLowerCase()) ? 0.5 : 0
  return coverage + phraseBonus
}
