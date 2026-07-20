// Spaced repetition (CLAUDE.md §7). On mastery a skill is scheduled for review at
// +2d, +7d, +21d; passing a review advances the stage, failing it demotes back to
// the first interval (re-practice). Session composition serves due reviews first,
// capped per session. Pure functions — persistence lives in store.ts, wiring in
// session runner.
import type { Review } from '../types'

const DAY = 86400000
export const REVIEW_OFFSETS_MS = [2 * DAY, 7 * DAY, 21 * DAY]
export const DUE_CAP = 4 // max due reviews served at the start of a session

// First review, scheduled when a skill is newly mastered.
export function scheduleFirst(skillId: string, now: number): Review {
  return { skillId, stage: 0, due: now + REVIEW_OFFSETS_MS[0], status: 'scheduled' }
}

// A review was passed → advance to the next interval, or graduate after the last.
export function onReviewPass(r: Review, now: number): Review {
  const next = r.stage + 1
  if (next >= REVIEW_OFFSETS_MS.length) return { ...r, stage: next, status: 'graduated' }
  return { ...r, stage: next, due: now + REVIEW_OFFSETS_MS[next], status: 'scheduled' }
}

// A review was failed → demote to the first interval (short re-practice) at the
// same stage 0, due after the shortest gap.
export function onReviewFail(r: Review, now: number): Review {
  return { ...r, stage: 0, due: now + REVIEW_OFFSETS_MS[0], status: 'scheduled' }
}

// Reviews due now (scheduled + past due), soonest first, capped.
export function dueReviews(reviews: Review[], now: number, cap = DUE_CAP): Review[] {
  return reviews
    .filter(r => r.status === 'scheduled' && r.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, cap)
}
