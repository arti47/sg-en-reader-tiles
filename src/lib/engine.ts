// Adaptive engine: mastery, difficulty, progression, dual gate, struggle (CLAUDE.md §7).
import type { Attempt, SkillDef, Difficulty } from '../types'
import { getSkill, SKILLS } from './packs'

const bySkill = (attempts: Attempt[], skillId: string) =>
  attempts.filter(a => a.skillId === skillId).sort((a, b) => a.ts - b.ts)

// Rolling-window accuracy over the last `window` attempts.
export function rollingAccuracy(attempts: Attempt[], skill: SkillDef): number {
  const w = bySkill(attempts, skill.id).slice(-skill.mastery.window)
  if (!w.length) return 0
  return w.filter(a => a.correct).length / w.length
}

export const itemsAnswered = (attempts: Attempt[], skillId: string) =>
  bySkill(attempts, skillId).length

// Difficulty 1–3: every unbroken streak of `promoteStreak` correct → +1 (cap 3); 2 wrong in
// last 4 → −1 (floor 1). Counting the trailing streak (not just "last N all correct") resets
// after each promotion, so a run of corrects climbs 1→2→3 (§7). `promoteStreak` defaults to 3;
// a slower value (from a child's difficulty flags, §1) escalates difficulty more gently.
export function nextDifficulty(attempts: Attempt[], skillId: string, current: Difficulty, promoteStreak = 3): Difficulty {
  const s = bySkill(attempts, skillId)
  let streak = 0
  for (let i = s.length - 1; i >= 0 && s[i].correct; i--) streak++
  if (streak > 0 && streak % promoteStreak === 0) return Math.min(3, current + 1) as Difficulty
  if (s.slice(-4).filter(a => !a.correct).length >= 2) return Math.max(1, current - 1) as Difficulty
  return current
}

// Single-skill mastery gate (attempts only).
export function skillMastered(attempts: Attempt[], skill: SkillDef): boolean {
  return itemsAnswered(attempts, skill.id) >= skill.mastery.minItems &&
    rollingAccuracy(attempts, skill) >= skill.mastery.accuracyToPass
}

// Mastery including skills pre-mastered at placement (which produce no attempts, §7).
export function isMastered(attempts: Attempt[], skill: SkillDef, pre?: Set<string>): boolean {
  return (pre?.has(skill.id) ?? false) || skillMastered(attempts, skill)
}

// Dual gate: a phonics/spelling pattern is mastered only when BOTH its decode and encode
// skills pass (§7). `pre` carries placement-mastered skill ids.
export function patternMastered(attempts: Attempt[], skill: SkillDef, pre?: Set<string>): boolean {
  if (!isMastered(attempts, skill, pre)) return false
  if (!skill.encodePairId) return true
  const pair = getSkill(skill.encodePairId)
  return !!pair && isMastered(attempts, pair, pre)
}

// Encode unlocks once its decode partner is reasonably solid — ~70% over at least ENCODE_UNLOCK_MIN
// real items (so a 3/3 fluke doesn't open spelling prematurely, §7 #7). A placement-confirmed
// decoder (in `pre`) has demonstrated reading and unlocks immediately, so a high placement's
// held-back encode entry (§7 spelling-confirmation, placement.ts) is eligible with no attempts.
export const ENCODE_UNLOCK_MIN = 6
export function encodeUnlocked(attempts: Attempt[], decodeSkill: SkillDef, pre?: Set<string>): boolean {
  if (pre?.has(decodeSkill.id)) return true
  return itemsAnswered(attempts, decodeSkill.id) >= ENCODE_UNLOCK_MIN && rollingAccuracy(attempts, decodeSkill) >= 0.7
}

// The decode skill that identifies a pattern (a spelling skill's pattern is its decode partner).
export function patternDecodeSkill(skill: SkillDef): SkillDef {
  return skill.strand === 'spelling' && skill.encodePairId ? getSkill(skill.encodePairId) ?? skill : skill
}

// Skills the session may serve now: own gate not yet passed, prereqs satisfied. An encode
// partner unlocks at 70% decode (guided overlap); a decode skill only unlocks once the
// PREVIOUS pattern is fully mastered — decode AND encode — enforcing the dual gate on
// advancement (§7). `pre` = skills already mastered at placement (no attempts of their own).
export function eligibleSkills(attempts: Attempt[], pre?: Set<string>): SkillDef[] {
  return SKILLS.filter(s => {
    if (s.threaded) return false // threaded skills (HF sight words) are woven in separately (§5/§6d)
    if (isMastered(attempts, s, pre)) return false
    return s.prereqs.every(p => {
      const preSkill = getSkill(p); if (!preSkill) return false
      return s.encodePairId === p ? encodeUnlocked(attempts, preSkill, pre) : patternMastered(attempts, preSkill, pre)
    })
  })
}

// Cumulative interleaving (§7, §17D): every Nth session item is a quick review of an
// already-mastered skill. ~18% of a 16-item session. Returns the skill to review, else
// undefined. Rotates through the mastered set so reviews spread across skills.
export const INTERLEAVE_EVERY = 5
export function interleavedReviewSkill(attempts: Attempt[], count: number, pre?: Set<string>, every = INTERLEAVE_EVERY): SkillDef | undefined {
  if (count <= 0 || count % every !== 0) return undefined
  const mastered = SKILLS.filter(s => isMastered(attempts, s, pre))
  if (!mastered.length) return undefined
  return mastered[Math.floor(count / every) % mastered.length]
}

// Fluency / automaticity loop (§7 — the defining dyslexia bottleneck). A pattern read
// ACCURATELY but SLOWLY still needs speed practice, so every FLUENCY_EVERY-th item serves a
// quick (difficulty-1) rep of the mastered decode skill whose recent-correct median response
// time is worst and over `maxMs`. Non-punitive: no visible timer; latency only picks WHICH
// mastered skill to revisit. Returns undefined off-cadence or when nothing is slow.
export const FLUENCY_EVERY = 6
export function medianLatency(attempts: Attempt[], skillId: string, n = 8): number | null {
  const lat = bySkill(attempts, skillId).filter(a => a.correct).slice(-n).map(a => a.latencyMs).sort((x, y) => x - y)
  if (lat.length < 4) return null
  return lat[Math.floor(lat.length / 2)]
}
export function fluencySkill(attempts: Attempt[], count: number, maxMs: number, pre?: Set<string>, every = FLUENCY_EVERY): SkillDef | undefined {
  if (count <= 0 || count % every !== 0) return undefined
  const slow = SKILLS
    .filter(s => s.strand === 'phonics' && !s.threaded && isMastered(attempts, s, pre))
    .map(s => ({ s, m: medianLatency(attempts, s.id) }))
    .filter(x => x.m !== null && x.m > maxMs)
    .sort((a, b) => (b.m as number) - (a.m as number))
  return slow[0]?.s
}

// High-frequency sight words threaded throughout every session (§5/§6d). Every
// THREAD_EVERY-th item serves a `threaded` skill (rotating if several), regardless of
// the child's level — so tricky words are learnt from the start, not gated at the end.
export const THREAD_EVERY = 4
export function threadedSkill(count: number): SkillDef | undefined {
  if (count <= 0 || count % THREAD_EVERY !== 0) return undefined
  const t = SKILLS.filter(s => s.threaded && s.enabled !== false)
  if (!t.length) return undefined
  return t[Math.floor(count / THREAD_EVERY) % t.length]
}

// Struggle: re-teach EARLY to minimise error exposure (OG, §7). Fires on accuracy < 0.6
// over ≥5 items, or 2 same-concept misses in the recent window (was <0.5/≥6 and 3 misses —
// too late for a struggling reader who has already failed half a block).
export function struggling(attempts: Attempt[], skill: SkillDef): boolean {
  const s = bySkill(attempts, skill.id)
  if (s.length >= 5 && rollingAccuracy(attempts, skill) < 0.6) return true
  const misses = s.filter(a => !a.correct).slice(-5)
  const counts = new Map<string, number>()
  for (const m of misses) if (m.missedConcept) counts.set(m.missedConcept, (counts.get(m.missedConcept) ?? 0) + 1)
  return [...counts.values()].some(c => c >= 2)
}
