// Difficulty-flag-driven personalisation (§1, §14). Pure. Maps a child's optional add-time
// difficulty flags to conservative tuning for weaker/dyslexic learners. With NO flags every
// value equals the engine/placement default, so unflagged children behave exactly as before.
import type { DifficultyFlag } from '../types'
import { INTERLEAVE_EVERY, FLUENCY_EVERY } from './engine'
import { PER_SKILL } from './placement'

export interface Support {
  interleaveEvery: number    // cumulative-review cadence (smaller = review mastered patterns more often)
  guidedItems: number        // easier items served after a lesson (§8 guided practice)
  placementPerSkill: number  // correct-in-a-row to climb a placement rung (higher = more conservative)
  promoteStreak: number      // correct streak to raise within-skill difficulty (higher = slower)
  fluencyMaxMs: number       // median decode latency above which automaticity practice kicks in
  fluencyEvery: number       // fluency-rep cadence
}

export const DEFAULT_SUPPORT: Support = {
  interleaveEvery: INTERLEAVE_EVERY, guidedItems: 3, placementPerSkill: PER_SKILL,
  promoteStreak: 3, fluencyMaxMs: 7000, fluencyEvery: FLUENCY_EVERY
}

// Weaker-reader tuning: more review, gentler difficulty climb, more conservative placement,
// a longer post-lesson scaffold, and (for a fluency flag) earlier/keener automaticity practice.
export function support(flags?: DifficultyFlag[]): Support {
  const f = new Set(flags ?? [])
  const s: Support = { ...DEFAULT_SUPPORT }
  // NB: interleave shares slots with the HF thread (THREAD_EVERY=4, checked first), so an
  // interleaveEvery that is a multiple/divisor of 4 gets shadowed — every-4 yields ZERO reviews.
  // Use 3 (coprime-ish with 4) so "more review" actually delivers more (4 vs the default 3 / 16).
  if (f.has('dyslexia') || f.has('decoding')) {
    s.interleaveEvery = 3
    s.guidedItems = 4
    s.placementPerSkill = 4
    s.promoteStreak = 4
  }
  if (f.has('fluency')) {
    s.fluencyMaxMs = 5000
    s.fluencyEvery = 5
    s.interleaveEvery = Math.min(s.interleaveEvery, 3)
  }
  return s
}
