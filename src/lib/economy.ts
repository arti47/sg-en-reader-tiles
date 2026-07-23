// Star Coins economy (M6 §20.4). Pure — the reward layer over the frozen pedagogy engine.
// Coins are cosmetic currency only (spent in the shop); they NEVER affect difficulty, mastery,
// or what is taught. Assessment answers earn the full amount; deliberately-easy reps (interleave/
// thread/fluency/SRS-review/guided/down-shift, tagged Attempt.review) earn a token amount so the
// economy tracks real work, mirroring the accuracy rules (§ readiness).
export const COIN_CORRECT = 5   // a correct assessment answer
export const COIN_REVIEW = 1    // a correct non-assessment rep
export const COIN_CERT = 50     // a pattern certificate (retention-confirmed mastery)
export const COIN_LEARN = 15    // completing a Learn unit (so learn-heavy readers still earn stars)

// Coins for a single answer. `review` = the item was a non-assessment rep.
export function coinsForAnswer(correct: boolean, review: boolean): number {
  if (!correct) return 0
  return review ? COIN_REVIEW : COIN_CORRECT
}

// ---- Daily goal + streak + reward chest (M6.4 §20.4) ----
import type { DailyGoal } from '../types'
export const DAILY_TARGET = 40   // Star Coins earned in a day to complete the daily goal
export const CHEST_BONUS = 25    // reward-chest bonus for finishing a mission (session)
export const streakBonus = (streak: number): number => Math.min(50, 10 * streak) // coins on goal completion

// Are two ISO days (YYYY-MM-DD) exactly one apart (today immediately follows prev)?
export function isNextDay(prev: string, today: string): boolean {
  if (!prev) return false
  const p = Date.parse(prev + 'T00:00:00'); const t = Date.parse(today + 'T00:00:00')
  return Number.isFinite(p) && Number.isFinite(t) && Math.round((t - p) / 86400000) === 1
}

// Roll the goal into `today` (reset progress on a new day; keep streak + lastGoalDay).
export function rollGoal(dg: DailyGoal, today: string): DailyGoal {
  if (dg.day === today) return dg
  return { ...dg, day: today, progress: 0, target: DAILY_TARGET }
}

// Record `earned` coins toward today's goal. Returns the updated goal and, when the goal is newly
// completed today, the streak-bonus coins to award (0 otherwise). Streak +1 if yesterday's goal was
// met, else resets to 1. Completing is once-per-day (guarded by lastGoalDay).
export function progressGoal(dg: DailyGoal, today: string, earned: number): { goal: DailyGoal; bonus: number; justCompleted: boolean } {
  const rolled = rollGoal(dg, today)
  const progress = rolled.progress + Math.max(0, earned)
  const alreadyDone = rolled.lastGoalDay === today
  if (!alreadyDone && progress >= rolled.target) {
    const streak = isNextDay(rolled.lastGoalDay, today) ? rolled.streak + 1 : 1
    return { goal: { ...rolled, progress, streak, lastGoalDay: today }, bonus: streakBonus(streak), justCompleted: true }
  }
  return { goal: { ...rolled, progress }, bonus: 0, justCompleted: false }
}
