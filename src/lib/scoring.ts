import type { PackItem } from '../types'
// M0: deterministic exact-match scoring (CLAUDE.md §12 — no AI at runtime).
export function scoreMcq(item: PackItem, choiceId: string) {
  const correct = choiceId === item.correctChoiceId
  return { correct, missedConcept: correct ? undefined : item.missedConceptOnFail }
}
