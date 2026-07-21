import type { PackItem } from '../types'
// Deterministic scoring (CLAUDE.md §12 — no AI at runtime).

export interface ScoreResult { correct: boolean; missedConcept?: string }

export function scoreMcq(item: PackItem, choiceId: string): ScoreResult {
  const correct = choiceId === item.correctChoiceId
  return { correct, missedConcept: correct ? undefined : item.missedConceptOnFail }
}

// grammar_cloze: every blank's assigned word must be in its authored acceptable[] list (§12).
export function scoreCloze(item: PackItem, answers: Record<string, string>): ScoreResult {
  const blanks = item.blanks ?? []
  const ok = blanks.length > 0 && blanks.every(b =>
    (b.acceptable ?? []).map(x => x.toLowerCase()).includes((answers[b.id] ?? '').trim().toLowerCase()))
  return ok ? { correct: true } : { correct: false, missedConcept: item.missedConceptOnFail }
}

// Encode (build_word/spell_tiles): grapheme sequence must match exactly (§12).
// On any mismatch the item's authored missedConceptOnFail tag is emitted (per-grapheme
// concept mapping isn't authored in the pack, so scoring stays at item granularity).
export function scoreTiles(item: PackItem, answer: string[]): ScoreResult {
  const target = item.graphemes ?? []
  const correct = answer.length === target.length && answer.every((g, i) => g === target[i])
  if (correct) return { correct: true }
  return { correct: false, missedConcept: item.missedConceptOnFail }
}
