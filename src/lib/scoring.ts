import type { PackItem } from '../types'
import graphemeConcepts from '../data/graphemeConcepts.json'
// Deterministic scoring (CLAUDE.md §12 — no AI at runtime).

export interface ScoreResult { correct: boolean; missedConcept?: string }

const GCONCEPT = graphemeConcepts as Record<string, string>

// Grapheme-level error analysis (§7): for an encode answer of the SAME length as the target,
// the first substituted tile names the concept from the EXPECTED grapheme (vowel confusion,
// digraph swap, r-controlled, b/d reversal → consonant-b…). Length mismatches (omission /
// insertion, e.g. a dropped silent-e) fall back to the item's authored tag, which is written
// for exactly those cases.
function tileMissedConcept(target: string[], answer: string[], fallback: string): string {
  if (answer.length === target.length) {
    for (let i = 0; i < target.length; i++) {
      if (answer[i] !== target[i]) return GCONCEPT[target[i]] ?? fallback
    }
  }
  return fallback
}

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

// Dictation: every word's tile sequence must match its authored graphemes (§12). On failure the
// first wrong word supplies a grapheme-level concept (§7) via the same substitution rule.
export function scoreDictation(item: PackItem, words: string[][]): ScoreResult {
  const target = item.words ?? []
  const wordOk = (w: { graphemes: string[] }, a: string[]) =>
    a.length === w.graphemes.length && a.every((g, j) => g === w.graphemes[j])
  const correct = words.length === target.length && target.every((w, i) => wordOk(w, words[i] ?? []))
  if (correct) return { correct: true }
  const bad = target.find((w, i) => !wordOk(w, words[i] ?? []))
  const concept = bad ? tileMissedConcept(bad.graphemes, words[target.indexOf(bad)] ?? [], item.missedConceptOnFail) : item.missedConceptOnFail
  return { correct: false, missedConcept: concept }
}

// Encode (build_word/spell_tiles): grapheme sequence must match exactly (§12). On a mismatch the
// concept is grapheme-level for substitutions (§7), else the item's authored tag.
export function scoreTiles(item: PackItem, answer: string[]): ScoreResult {
  const target = item.graphemes ?? []
  const correct = answer.length === target.length && answer.every((g, i) => g === target[i])
  if (correct) return { correct: true }
  return { correct: false, missedConcept: tileMissedConcept(target, answer, item.missedConceptOnFail) }
}
