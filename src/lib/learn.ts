// M5 Learn/Test dual-mode — pure pattern/status logic (§19). A "pattern" is a phonics DECODE
// skill that has an encode pair (the dual-gated read+spell unit), identified by its decode skill
// id. Threaded skills (letter-sounds, HF) and non-pattern strands (reading, M3) are NOT patterns.
import type { SkillDef, LearnState, PatternStatus } from '../types'
import { SKILLS } from './packs'

// The learnable patterns, in scope order (== the decode ladder).
export const PATTERNS: SkillDef[] =
  SKILLS.filter(s => s.strand === 'phonics' && s.itemType === 'decode_choice' && !!s.encodePairId)

const PATTERN_IDS = new Set(PATTERNS.map(p => p.id))

// A pattern's gating patterns = its decode skill's prereqs that are themselves patterns.
const patternPrereqs = (p: SkillDef): string[] => p.prereqs.filter(id => PATTERN_IDS.has(id))

// Set of pattern ids the child has learned (Learn unit completed or placement-credited).
export const learnedSet = (rows: LearnState[]): Set<string> =>
  new Set(rows.filter(r => r.learned).map(r => r.patternId))

// Set of learned patterns flagged for re-teaching by Test (needs-review).
export const needsReviewSet = (rows: LearnState[]): Set<string> =>
  new Set(rows.filter(r => r.needsReview).map(r => r.patternId))

// The Learn frontier: the first pattern (scope order) whose gating patterns are all learned and
// that is not itself learned yet. Drives Learn's linear order. Undefined when all are learned.
export function nextToLearn(learned: Set<string>): SkillDef | undefined {
  return PATTERNS.find(p => !learned.has(p.id) && patternPrereqs(p).every(id => learned.has(id)))
}

// Per-pattern status for the Learn map (§19.3), in priority order. `mastered` comes from the
// caller (derived from progress/certificates — the single source of truth for mastery). Mastered
// wins over needs-review: a certified pattern is never knocked back to "needs teaching" by a rough
// Test round (§7 "mastery = retention" — only a failed SRS review demotes), so it never reverts on
// the galaxy. needs-review therefore only surfaces on a learned-but-not-yet-mastered pattern.
export function patternStatus(patternId: string, rows: LearnState[], mastered: boolean): PatternStatus {
  const row = rows.find(r => r.patternId === patternId)
  if (mastered) return 'mastered'
  if (row?.needsReview) return 'needs-review'
  if (row?.learned) return 'learned'
  return 'not-started'
}
