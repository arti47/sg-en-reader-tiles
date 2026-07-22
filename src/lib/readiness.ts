// PSLE-readiness indicator + action plan (§10). Pure, deterministic, non-alarming, framed
// on AL1–AL8 but foregrounding GROWTH for literacy-difficulty learners. The band is a coarse
// early estimate over the foundation ladder (PSLE Paper-2 strands arrive in M3), shown to the
// parent only — never a verdict on the child.
import type { Attempt, Aggregate } from '../types'

export type Status = 'On-Target' | 'Some-Risk' | 'High-Risk'
export type FluencyBand = 'quick' | 'developing' | 'effortful' | 'n/a'
export interface Readiness {
  status: Status
  band: string
  coverage: number
  // recentAccuracy is null when there is no ASSESSMENT data yet (a freshly-placed child, or a
  // session of only reps) — the dashboard shows "—", never a misleading 100%. assessedN = how
  // many assessment attempts backed it.
  growth: { mastered: number; recentAccuracy: number | null; assessedN: number; weeksActive: number }
  fluency: { medianMs: number | null; band: FluencyBand; effortfulButAccurate: boolean }
  action: { text: string; tags: string[] }
}

// Assessment attempts only — exclude non-assessment REPS (interleave/thread/fluency/SRS-review/
// guided/down-shift, tagged `review` in Session). They are deliberately easy, so counting them
// inflates the headline accuracy and readiness (a struggling child would look fine). Per-skill
// mastery is unaffected (it scopes to one skill). Legacy rows have no flag ⇒ counted as assessment.
const assessed = (attempts: Attempt[]) => attempts.filter(a => !a.review)

// Automaticity signal (§7 — the defining dyslexia bottleneck). NON-GATING: median response time
// on recent CORRECT answers, reported for the teacher only, never a child-facing timer. The
// "effortful but accurate" case (high accuracy, slow) is the classic dyslexia signature.
function fluency(attempts: Attempt[], acc: number, n = 30): Readiness['fluency'] {
  // Reading fluency = DECODING speed: exclude the inherently slower encode/dictation (SP-*) items
  // so tile-building time doesn't mislabel a child "effortful" (§7 #6), and exclude easy reps so
  // trivial fast reviews don't flatter the median.
  const lat = assessed(attempts).filter(a => a.correct && !a.skillId.startsWith('SP-')).slice(-n).map(a => a.latencyMs).sort((x, y) => x - y)
  if (lat.length < 5) return { medianMs: null, band: 'n/a', effortfulButAccurate: false }
  const medianMs = lat[Math.floor(lat.length / 2)]
  const band: FluencyBand = medianMs < 3500 ? 'quick' : medianMs < 7000 ? 'developing' : 'effortful'
  return { medianMs, band, effortfulButAccurate: band === 'effortful' && acc >= 0.85 }
}

const humanize = (tag: string) => tag.replace(/-/g, ' ')

// Recent accuracy over ASSESSMENT attempts only; null when there is no assessment data yet.
function recentAccuracy(attempts: Attempt[], n = 30): { acc: number | null; n: number } {
  const recent = assessed(attempts).slice(-n)
  if (!recent.length) return { acc: null, n: 0 }
  return { acc: recent.filter(a => a.correct).length / recent.length, n: recent.length }
}

// Top recurring miss concepts among recent wrong ASSESSMENT answers (the "stuck on" tags).
function stuckTags(attempts: Attempt[], n = 40, max = 2): string[] {
  const counts = new Map<string, number>()
  for (const a of assessed(attempts).slice(-n)) {
    if (!a.correct && a.missedConcept) counts.set(a.missedConcept, (counts.get(a.missedConcept) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, max).map(([t]) => t)
}

export function computeReadiness(
  attempts: Attempt[], masteredSkillIds: Set<string>, aggregates: Aggregate[], totalSkills: number
): Readiness {
  const { acc, n: assessedN } = recentAccuracy(attempts)
  const mastered = masteredSkillIds.size
  const weeksActive = new Set(aggregates.map(a => a.week)).size
  const coverage = totalSkills > 0 ? mastered / totalSkills : 0
  const tags = stuckTags(attempts)

  // Risk only from real assessment signal: need ≥6 assessment attempts before flagging, and never
  // flag on a null (no-data) accuracy — a child who has only done reps isn't "at risk".
  let status: Status = 'On-Target'
  if (acc !== null && assessedN >= 6 && acc < 0.5) status = 'High-Risk'
  else if ((acc !== null && acc < 0.75) || (weeksActive >= 2 && mastered === 0)) status = 'Some-Risk'

  // Coarse AL: blend coverage (60%) and recent accuracy (40%); 1.0 → AL1, 0 → AL8. With no
  // accuracy signal yet, fall back to coverage alone rather than assuming a perfect score.
  const score = acc === null ? coverage : 0.6 * coverage + 0.4 * acc
  const al = Math.min(8, Math.max(1, Math.round(8 - score * 7)))
  const band = `AL${al} (early estimate)`

  const fl = fluency(attempts, acc ?? 1)

  let text: string
  if (tags.length) text = `Practise ${humanize(tags[0])} — a few short sessions this week.`
  else if (mastered === 0) text = 'Warm up with the letter sounds and short words.'
  else if (fl.effortfulButAccurate) text = 'Accurate but still effortful — keep practising the same skills to build reading speed.'
  else if (status === 'On-Target') text = 'On track — keep the weekly sessions going.'
  else text = 'Keep practising the current skill — short, regular sessions help most.'

  return { status, band, coverage, growth: { mastered, recentAccuracy: acc, assessedN, weeksActive }, fluency: fl, action: { text, tags } }
}
