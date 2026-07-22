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

// 3 items/level (was 2): two lucky 3-choice guesses (1/9) could fluke a level and OVER-place a
// struggling reader above their true instructional level; 3/3 drops that to ~1/27 and, capped at
// MAX_ITEMS, keeps placement conservative (start low, confirm foundations — §7).
export const PER_SKILL = 3
export const MAX_ITEMS = 15
// A warm-up should feel like a few gentle items, not stop after 2 when the child misses the
// first pair (CVC is the floor, so the staircase has nowhere down). Once the entry level is
// decided, top up with achievable items to this minimum, ending on an easy one (§7).
export const MIN_WARMUP = 6

export interface PlaceResult { skillId: string; correct: boolean }

// The lowest ladder skill not yet passed (needs more items, or failed here). `perSkill` = how
// many correct-in-a-row a rung requires (raised for weaker readers via difficulty flags, §1).
function lowestUnpassed(results: PlaceResult[], perSkill = PER_SKILL): string {
  for (const s of decodeLadder) {
    const r = results.filter(x => x.skillId === s.id)
    if (r.length < perSkill || r.filter(x => x.correct).length < perSkill) return s.id
  }
  return decodeLadder[decodeLadder.length - 1].id
}

// Given the results so far, decide the next step: draw another item from `skillId`,
// or finish and place the child at `entrySkillId`.
export function nextPlacement(results: PlaceResult[], perSkill = PER_SKILL): { done: boolean; skillId?: string; entrySkillId?: string } {
  if (results.length >= MAX_ITEMS) return { done: true, entrySkillId: lowestUnpassed(results, perSkill) }
  for (const s of decodeLadder) {
    const r = results.filter(x => x.skillId === s.id)
    if (r.length < perSkill) return { done: false, skillId: s.id }
    if (r.filter(x => x.correct).length < perSkill) return { done: true, entrySkillId: s.id }
  }
  return { done: true, entrySkillId: decodeLadder[decodeLadder.length - 1].id }
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
