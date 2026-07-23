// M7.1 Decode/Spell Struggle Diagnostic (§21.2 A). Pure, read-only classification of a child's
// difficulty into acquisition / retention / confusion from data the app ALREADY logs — attempts
// (with missedConcept/latency/review), the SRS `reviews` schedule, and progress. It NEVER changes
// behaviour (M7.1 is diagnostic only; M7.2 acts on it). Self-gating: returns `none` unless there is
// enough ASSESSMENT evidence AND a signal crosses threshold, so a typical reader is never flagged.
// Thresholds are deliberately conservative and documented as tunable against the family's real
// data (§21.8) — the goal is an honest, growth-framed finding for the parent, not a verdict.
import type { Attempt, Review } from '../types'

export type DiagnosisCategory = 'acquisition' | 'retention' | 'confusion'
export interface Diagnosis {
  categories: DiagnosisCategory[]        // every category that tripped, most-significant first
  primary: DiagnosisCategory | null      // the dominant one, or null (= none / not enough data)
  assessedN: number                      // assessment attempts backing this (excludes easy reps)
  acquisitionAcc: number | null          // recent first-attempt (assessment) accuracy, null if no data
  reviewsStuck: number                   // SRS reviews past-due and still at the first stage (weak retention)
  stuckConcepts: string[]                // dominant missedConcept tags (the confusion pairs)
  note: string                           // plain-language, growth-framed finding for the dashboard
}

export const MIN_ASSESSED = 12   // need this much assessment evidence before diagnosing (else 'none')
const ACQ_ACC = 0.6              // recent assessment accuracy below this ⇒ acquisition difficulty
const ACQ_WINDOW = 30
const RETAIN_STUCK = 2          // this many past-due, un-advanced (stage-0) reviews ⇒ retention difficulty
const CONF_WINDOW = 40
const CONF_MIN = 3              // a concept must miss at least this many times…
const CONF_SHARE = 0.4         // …and hold at least this share of recent misses ⇒ confusion

// Assessment attempts only — exclude the deliberately-easy reps (interleave/thread/fluency/
// SRS-review/guided/down-shift, tagged `review`), which would otherwise flatter the signal (§9).
const assessed = (a: Attempt[]) => a.filter(x => !x.review)

function acquisition(as: Attempt[]): number | null {
  const recent = as.slice(-ACQ_WINDOW)
  if (!recent.length) return null
  return recent.filter(a => a.correct).length / recent.length
}

// Top recurring miss concepts among recent wrong assessment answers, with their share of misses.
function confusion(as: Attempt[]): { concepts: string[]; share: number; count: number } {
  const misses = as.slice(-CONF_WINDOW).filter(a => !a.correct && a.missedConcept)
  const counts = new Map<string, number>()
  for (const a of misses) counts.set(a.missedConcept!, (counts.get(a.missedConcept!) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((x, y) => y[1] - x[1])
  const total = misses.length
  const top = ranked[0]
  if (!top || total === 0) return { concepts: [], share: 0, count: 0 }
  const share = top[1] / total
  const concepts = ranked.filter(([, c]) => c >= CONF_MIN).slice(0, 2).map(([t]) => t)
  return { concepts, share, count: top[1] }
}

const humanize = (t: string) => t.replace(/-/g, ' ')

const NOTE: Record<DiagnosisCategory, (d: Diagnosis) => string> = {
  acquisition: () => 'New sounds and words are hard to grasp at first. Go slower with more sound practice and small steps — the wins come with repetition.',
  retention: () => 'They can do it in a session, but it fades before the next. Short, frequent sessions and more review help it stick.',
  confusion: d => `Mixing up a few specific sounds or letters (${d.stuckConcepts.map(humanize).join(', ')}). Targeted practice on those pairs will clear it.`
}

// Classify a child. `now` is injectable for deterministic tests (defaults to Date.now()).
export function diagnose(attempts: Attempt[], reviews: Review[], now: number = Date.now()): Diagnosis {
  const as = assessed(attempts)
  const assessedN = as.length
  const acc = acquisition(as)
  const reviewsStuck = reviews.filter(r => r.status === 'scheduled' && r.stage === 0 && r.due <= now).length
  const conf = confusion(as)

  const base: Diagnosis = {
    categories: [], primary: null, assessedN, acquisitionAcc: acc,
    reviewsStuck, stuckConcepts: conf.concepts, note: ''
  }

  // Self-gate: not enough assessment evidence yet → no finding (never guess on thin data).
  if (assessedN < MIN_ASSESSED) {
    return { ...base, note: 'Not enough data yet — keep going, and a picture will build here.' }
  }

  // Collect tripped categories with a rough severity so `primary` is the strongest signal.
  const tripped: { cat: DiagnosisCategory; sev: number }[] = []
  if (acc !== null && acc < ACQ_ACC) tripped.push({ cat: 'acquisition', sev: (ACQ_ACC - acc) / ACQ_ACC })
  if (reviewsStuck >= RETAIN_STUCK) tripped.push({ cat: 'retention', sev: reviewsStuck / RETAIN_STUCK })
  if (conf.count >= CONF_MIN && conf.share >= CONF_SHARE && conf.concepts.length) tripped.push({ cat: 'confusion', sev: conf.share })
  tripped.sort((a, b) => b.sev - a.sev)

  if (!tripped.length) {
    return { ...base, note: 'Doing well — steady progress, no specific difficulty to flag right now.' }
  }
  const categories = tripped.map(t => t.cat)
  const primary = categories[0]
  return { ...base, categories, primary, note: NOTE[primary](base) }
}
