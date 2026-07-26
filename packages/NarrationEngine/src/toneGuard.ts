import { applyTerminologyGuards, findForbiddenTerminology, type TerminologyRewrite } from './terminologyGuards.js'

export type ProseToneValidation = {
  ok: boolean
  prose: string
  rewrites: TerminologyRewrite[]
  violations: string[]
}

export function validateProseTone(prose: string): ProseToneValidation {
  const { text, rewrites } = applyTerminologyGuards(prose)
  const violations = findForbiddenTerminology(text)

  return {
    ok: violations.length === 0,
    prose: text,
    rewrites,
    violations
  }
}
