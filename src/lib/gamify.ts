// Gamification (§14, M4). Pure, derived from the attempt/certificate history — no separate
// stored score to drift. Growth-framed: XP rewards effort (every correct answer) plus mastery
// (certificates), never punishes wrong answers.
import type { Attempt, Certificate, Usage } from '../types'

export const XP_PER_CORRECT = 10
export const XP_PER_CERT = 50

export function xp(attempts: Attempt[], certs: Certificate[]): number {
  return attempts.reduce((n, a) => n + (a.correct ? XP_PER_CORRECT : 0), 0) + certs.length * XP_PER_CERT
}

// Levels grow ~quadratically so early levels come quickly and later ones take longer.
// level 1 at 0 XP; each level L needs 100*L*(L-1)/2 cumulative XP.
export function level(totalXp: number): number {
  let lvl = 1
  while (totalXp >= 50 * lvl * (lvl + 1)) lvl++
  return lvl
}

// XP still needed to reach the next level (for a progress bar).
export function toNextLevel(totalXp: number): { intoLevel: number; span: number } {
  const l = level(totalXp)
  const floor = 50 * (l - 1) * l
  const ceil = 50 * l * (l + 1)
  return { intoLevel: totalXp - floor, span: ceil - floor }
}

// Achievement badges (§14 gamification depth). Pure, derived — growth-milestones only,
// never failure-framed. Returned in a fixed order with an `earned` flag so the UI can show
// locked ones greyed out.
export interface Achievement { id: string; label: string; icon: string; earned: boolean }
export function achievements(attempts: Attempt[], certs: Certificate[], usage?: Usage): Achievement[] {
  const correct = attempts.filter(a => a.correct).length
  const streak = usage?.streakWeeks ?? 0
  const def: [string, string, string, boolean][] = [
    ['getting-started', 'Getting started', '🌱', attempts.length >= 1],
    ['first-cert', 'First certificate', '🏅', certs.length >= 1],
    ['half-century', '50 correct', '⭐', correct >= 50],
    ['century', '100 correct', '💯', correct >= 100],
    ['five-skills', 'Five skills', '🎖️', certs.length >= 5],
    ['on-a-roll', '3-week streak', '🔥', streak >= 3]
  ]
  return def.map(([id, label, icon, earned]) => ({ id, label, icon, earned }))
}
