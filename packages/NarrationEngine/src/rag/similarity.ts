export function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0
  }

  let dot = 0
  let leftMag = 0
  let rightMag = 0
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0
    const rightValue = right[index] ?? 0
    dot += leftValue * rightValue
    leftMag += leftValue * leftValue
    rightMag += rightValue * rightValue
  }

  const magnitude = Math.sqrt(leftMag) * Math.sqrt(rightMag)
  return magnitude === 0 ? 0 : dot / magnitude
}
