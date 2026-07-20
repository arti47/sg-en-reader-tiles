// Adaptive engine: mastery, difficulty, progression, dual gate, struggle (CLAUDE.md §7).
import type { Attempt, SkillDef, Difficulty } from '../types'
import { getSkill } from './packs'

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

// Difficulty 1–3: streak of 3 correct → +1; 2 wrong in last 4 → −1.
export function nextDifficulty(attempts: Attempt[], skillId: string, current: Difficulty): Difficulty {
  const recent = bySkill(attempts, skillId).slice(-4)
  const last3 = recent.slice(-3)
  if (last3.length === 3 && last3.every(a => a.correct)) return Math.min(3, current + 1) as Difficulty
  if (recent.filter(a => !a.correct).length >= 2) return Math.max(1, current - 1) as Difficulty
  return current
}

// Single-skill mastery gate.
export function skillMastered(attempts: Attempt[], skill: SkillDef): boolean {
  return itemsAnswered(attempts, skill.id) >= skill.mastery.minItems &&
    rollingAccuracy(attempts, skill) >= skill.mastery.accuracyToPass
}

// Dual gate: a phonics/spelling pattern advances only when BOTH decode and encode pass (§7).
export function patternMastered(attempts: Attempt[], skill: SkillDef): boolean {
  if (!skillMastered(attempts, skill)) return false
  if (!skill.encodePairId) return true
  const pair = getSkill(skill.encodePairId)
  return !!pair && skillMastered(attempts, pair)
}

// Encode unlocks once its decode partner reaches ~70% (guided overlap).
export function encodeUnlocked(attempts: Attempt[], decodeSkill: SkillDef): boolean {
  return rollingAccuracy(attempts, decodeSkill) >= 0.7
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
