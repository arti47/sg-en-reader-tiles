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

// Difficulty 1–3: every unbroken streak of 3 correct → +1 (cap 3); 2 wrong in last 4 → −1
// (floor 1). Counting the trailing streak (not just "last 3 all correct") resets after each
// promotion, so a run of corrects climbs 1→2→3 over 6 items, not 4 (§7).
export function nextDifficulty(attempts: Attempt[], skillId: string, current: Difficulty): Difficulty {
  const s = bySkill(attempts, skillId)
  let streak = 0
  for (let i = s.length - 1; i >= 0 && s[i].correct; i--) streak++
  if (streak > 0 && streak % 3 === 0) return Math.min(3, current + 1) as Difficulty
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

// Encode unlocks once its decode partner reaches ~70% (guided overlap).
export function encodeUnlocked(attempts: Attempt[], decodeSkill: SkillDef): boolean {
  return rollingAccuracy(attempts, decodeSkill) >= 0.7
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
    if (isMastered(attempts, s, pre)) return false
    return s.prereqs.every(p => {
      const preSkill = getSkill(p); if (!preSkill) return false
      return s.encodePairId === p ? encodeUnlocked(attempts, preSkill) : patternMastered(attempts, preSkill, pre)
    })
  })
}

// Struggle: accuracy < 0.5 over ≥6 items, or 3 same-concept misses.
export function struggling(attempts: Attempt[], skill: SkillDef): boolean {
  const s = bySkill(attempts, skill.id)
  if (s.length >= 6 && rollingAccuracy(attempts, skill) < 0.5) return true
  const misses = s.filter(a => !a.correct).slice(-5)
  const counts = new Map<string, number>()
  for (const m of misses) if (m.missedConcept) counts.set(m.missedConcept, (counts.get(m.missedConcept) ?? 0) + 1)
  return [...counts.values()].some(c => c >= 3)
}
