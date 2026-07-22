// Warm-up reading placement (CLAUDE.md §7). Walks UP the decoding ladder from the
// easiest skill; a child must pass PER_SKILL items at a level to advance. Placement
// stops at the first level they can't pass — that becomes their entry (instructional
// level, decoupled from chronological P-level). Short (≤ MAX_ITEMS), low-pressure,
// no right/wrong feedback shown during the walk (that's enforced in the UI).
import type { SkillDef } from '../types'
import { SKILLS, getSkill } from './packs'

// The decoding ladder = phonics decode skills that have an encode partner (the
// dual-gated pattern skills), in scope order. Excludes HF-words (no encode pair).
export const decodeLadder: SkillDef[] =
  SKILLS.filter(s => s.strand === 'phonics' && s.itemType === 'decode_choice' && !!s.encodePairId)

// 3 items/level (the fine-refine PER, the decision-maker): two lucky 3-choice guesses (1/9) could
// fluke a level and OVER-place a struggling reader above their true instructional level; 3/3 drops
// that to ~1/27 and keeps placement conservative (start low, confirm foundations — §7). Raised to 4
// for weaker readers via difficulty flags (§1).
export const PER_SKILL = 3
// A single linear walk (PER_SKILL correct at EVERY rung to climb) can't span the ladder within a
// short warm-up: 20 dual-gated rungs × 3 = 60 items. So placement is CHECKPOINT + REFINE — a coarse
// pass probes rungs STRIDE apart (PER_COARSE each) to find the BAND a child's level sits in, then a
// fine pass walks that band rung-by-rung (PER_SKILL each, from the low end → conservative) to pin the
// entry. This reaches a strong reader's true level in ~12 items while staying start-low for a weak one.
export const STRIDE = 4
export const PER_COARSE = 2
export const MAX_ITEMS = 22
// A warm-up should feel like a few gentle items, not stop after 2 when the child misses the
// first pair (CVC is the floor, so the staircase has nowhere down). Once the entry level is
// decided, top up with achievable items to this minimum, ending on an easy one (§7).
export const MIN_WARMUP = 6

export interface PlaceResult { skillId: string; correct: boolean }

const tallyAt = (results: PlaceResult[], idx: number) => {
  const id = decodeLadder[idx].id
  const r = results.filter(x => x.skillId === id)
  return { total: r.length, correct: r.filter(x => x.correct).length }
}

// Checkpoint ladder indices: every STRIDE rungs, always including the top rung.
function checkpointIdxs(): number[] {
  const top = decodeLadder.length - 1
  const cps: number[] = []
  for (let i = 0; i <= top; i += STRIDE) cps.push(i)
  if (cps[cps.length - 1] !== top) cps.push(top)
  return cps
}

// Coarse pass — walk checkpoints low→high (PER_COARSE probes each). Returns the checkpoint still
// being probed (`serve`), the refine BAND [lo,hi] once a checkpoint fails (entry ∈ [lo..hi], with
// checkpoints excluded from the middle so coarse/fine tallies never overlap), or `top` when every
// checkpoint passed. Pure — reconstructable from `results` alone (no external phase state).
function coarseState(results: PlaceResult[]): { serve?: number; band?: [number, number]; top?: boolean } {
  let prevPass = -1
  for (const cp of checkpointIdxs()) {
    const t = tallyAt(results, cp)
    if (t.total < PER_COARSE) return { serve: cp }        // still probing this checkpoint
    if (t.correct >= PER_COARSE) { prevPass = cp; continue } // passed → probe higher
    return { band: [prevPass + 1, cp] }                    // failed → entry is in (prevPass, cp]
  }
  return { top: true }
}

// Given the results so far, decide the next step: draw another item from `skillId`,
// or finish and place the child at `entrySkillId`. `perSkill` = the fine-refine PER.
export function nextPlacement(results: PlaceResult[], perSkill = PER_SKILL): { done: boolean; skillId?: string; entrySkillId?: string } {
  const atCap = results.length >= MAX_ITEMS
  const top = decodeLadder.length - 1
  const c = coarseState(results)
  if (c.top) return { done: true, entrySkillId: decodeLadder[top].id }
  if (c.serve !== undefined) {
    return atCap ? { done: true, entrySkillId: decodeLadder[c.serve].id } : { done: false, skillId: decodeLadder[c.serve].id }
  }
  // Refine the band [lo,hi]: walk the middle rungs (lo..hi-1) from the low end; the first rung not
  // passed is the entry. Pass all middle rungs → entry is `hi` (the checkpoint already failed coarse).
  const [lo, hi] = c.band!
  for (let r = lo; r <= hi - 1; r++) {
    const t = tallyAt(results, r)
    if (t.total < perSkill) return atCap ? { done: true, entrySkillId: decodeLadder[r].id } : { done: false, skillId: decodeLadder[r].id }
    if (t.correct >= perSkill) continue
    return { done: true, entrySkillId: decodeLadder[r].id }
  }
  return { done: true, entrySkillId: decodeLadder[hi].id }
}

// Skills to mark mastered on placement: every ladder skill BELOW the entry level (the child
// demonstrably READS those), plus any non-ladder foundation skill those rungs depend on
// (e.g. letter-sounds under CVC) so a high placement doesn't leave the foundation blocking.
//
// Spelling lags decoding in dyslexia, so placement must NOT hand out spelling for free (§7 #3).
// The reading placement only tests decoding, so we credit the encode partners of the LOWER
// rungs (well below instructional level) but HOLD BACK the encode partner of the highest read
// rung — the child must earn that spelling in-session before the decode entry unlocks (its
// prereq is that rung's full decode+encode pattern). encodeUnlocked() treats the credited
// decoder as ≥70%, so the held-back encode skill is immediately eligible. Disabled foundations
// resolve to undefined via getSkill and are skipped.
export function priorSkillIds(entrySkillId: string): string[] {
  const idx = decodeLadder.findIndex(s => s.id === entrySkillId)
  if (idx <= 0) return []
  const priors = decodeLadder.slice(0, idx)
  // Hold back the TOP TWO read rungs' spelling (§7 #3): a decode-only placement must not credit
  // spelling it never observed, and in dyslexia decode ≫ encode is common, so two rungs of
  // encode are earned in-session before advancing (only the top one is far too little).
  const heldEncode = new Set([priors[priors.length - 1]?.encodePairId, priors[priors.length - 2]?.encodePairId].filter(Boolean))
  const ids: string[] = []
  for (const s of priors) {
    ids.push(s.id)
    if (s.encodePairId && !heldEncode.has(s.encodePairId)) ids.push(s.encodePairId)
  }
  for (const s of priors) for (const p of s.prereqs) {
    const pre = getSkill(p)
    if (pre && !decodeLadder.includes(pre) && !ids.includes(p)) ids.push(p)
  }
  // Connected-text reading rungs (T19) whose gating decode pattern is already read → credit them
  // too: a child who placed above a level can already read that level's decodable sentences, so
  // don't re-teach them (and don't dilute the eligible rotation). Lower rungs stay in-session.
  for (const s of SKILLS) {
    if (s.strand !== 'reading') continue
    if (s.prereqs.length && s.prereqs.every(p => ids.includes(p))) ids.push(s.id)
  }
  return ids
}
