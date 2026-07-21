// Gamification (§14, M4). Pure, derived from the attempt/certificate history — no separate
// stored score to drift. Growth-framed: XP rewards effort (every correct answer) plus mastery
// (certificates), never punishes wrong answers.
import type { Attempt, Certificate } from '../types'

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
