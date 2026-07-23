// M7.2 auto-adapt (§21.2 B). Pure. Maps a decode/spell Diagnosis (from diagnose.ts) → ADDITIVE
// tuning deltas applied on top of the flag-based support (§1). Every field is 0/false unless the
// matching difficulty is flagged, so a typical reader (Diagnosis primary null / no categories) gets
// NO_ADAPT and behaves exactly as before (self-gating, §21.1). Nothing here lowers a mastery bar
// (§21.4): acquisition adds PRACTICE (more PA warm-up + a longer guided block); retention adds
// RETRIEVAL (more due reviews per session + one extra SRS stage before graduation), which makes
// mastery MORE conservative, never easier. Confusion is handled separately by the drill engine (M7.4).
import type { Diagnosis } from './diagnose'

export interface Adaptation {
  paBonus: number           // + phonemic-awareness warm-up items in a Learn unit (acquisition)
  guidedBonus: number       // + items in the post-lesson / re-practice guided block (acquisition)
  dueCapBonus: number       // + due reviews served at the start of a session (retention)
  extraReviewStage: boolean // + one SRS stage before graduation → more retrieval (retention, conservative)
}
export const NO_ADAPT: Adaptation = { paBonus: 0, guidedBonus: 0, dueCapBonus: 0, extraReviewStage: false }

export function adaptFor(dx: Diagnosis): Adaptation {
  const cats = new Set(dx.categories) // act on EVERY tripped category (a child can be both)
  return {
    paBonus: cats.has('acquisition') ? 2 : 0,
    guidedBonus: cats.has('acquisition') ? 2 : 0,
    dueCapBonus: cats.has('retention') ? 2 : 0,
    extraReviewStage: cats.has('retention')
  }
}
