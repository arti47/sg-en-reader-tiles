// PSLE-readiness indicator + action plan (§10). Pure, deterministic, non-alarming, framed
// on AL1–AL8 but foregrounding GROWTH for literacy-difficulty learners. The band is a coarse
// early estimate over the foundation ladder (PSLE Paper-2 strands arrive in M3), shown to the
// parent only — never a verdict on the child.
import type { Attempt, Aggregate } from '../types'

export type Status = 'On-Target' | 'Some-Risk' | 'High-Risk'
export interface Readiness {
  status: Status
  band: string
  coverage: number
  growth: { mastered: number; recentAccuracy: number; weeksActive: number }
  action: { text: string; tags: string[] }
}

const humanize = (tag: string) => tag.replace(/-/g, ' ')

function recentAccuracy(attempts: Attempt[], n = 30): number {
  const recent = attempts.slice(-n)
  if (!recent.length) return 1
  return recent.filter(a => a.correct).length / recent.length
}

// Top recurring miss concepts among recent wrong answers (the "stuck on" tags).
function stuckTags(attempts: Attempt[], n = 40, max = 2): string[] {
  const counts = new Map<string, number>()
  for (const a of attempts.slice(-n)) {
    if (!a.correct && a.missedConcept) counts.set(a.missedConcept, (counts.get(a.missedConcept) ?? 0) + 1)
  }
  return [...counts.entries()].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1]).slice(0, max).map(([t]) => t)
}

export function computeReadiness(
  attempts: Attempt[], masteredSkillIds: Set<string>, aggregates: Aggregate[], totalSkills: number
): Readiness {
  const acc = recentAccuracy(attempts)
  const mastered = masteredSkillIds.size
  const weeksActive = new Set(aggregates.map(a => a.week)).size
  const coverage = totalSkills > 0 ? mastered / totalSkills : 0
  const tags = stuckTags(attempts)

  let status: Status = 'On-Target'
  if (attempts.length >= 6 && acc < 0.5) status = 'High-Risk'
  else if (acc < 0.75 || (weeksActive >= 2 && mastered === 0)) status = 'Some-Risk'

  // Coarse AL: blend coverage (60%) and recent accuracy (40%); 1.0 → AL1, 0 → AL8.
  const score = 0.6 * coverage + 0.4 * acc
  const al = Math.min(8, Math.max(1, Math.round(8 - score * 7)))
  const band = `AL${al} (early estimate)`

  let text: string
  if (tags.length) text = `Practise ${humanize(tags[0])} — a few short sessions this week.`
  else if (mastered === 0) text = 'Warm up with the letter sounds and short words.'
  else if (status === 'On-Target') text = 'On track — keep the weekly sessions going.'
  else text = 'Keep practising the current skill — short, regular sessions help most.'

  return { status, band, coverage, growth: { mastered, recentAccuracy: acc, weeksActive }, action: { text, tags } }
}
