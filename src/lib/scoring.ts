import type { PackItem } from '../types'
// Deterministic scoring (CLAUDE.md §12 — no AI at runtime).

export interface ScoreResult { correct: boolean; missedConcept?: string }

export function scoreMcq(item: PackItem, choiceId: string): ScoreResult {
  const correct = choiceId === item.correctChoiceId
  return { correct, missedConcept: correct ? undefined : item.missedConceptOnFail }
}

// Encode (build_word/spell_tiles): grapheme sequence must match exactly (§12).
// Error analysis: first positional grapheme mismatch → concept tag, else generic.
export function scoreTiles(item: PackItem, answer: string[]): ScoreResult {
  const target = item.graphemes ?? []
  const correct = answer.length === target.length && answer.every((g, i) => g === target[i])
  if (correct) return { correct: true }
  return { correct: false, missedConcept: item.missedConceptOnFail }
}
