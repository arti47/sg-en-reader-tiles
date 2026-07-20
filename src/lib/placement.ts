// Warm-up reading placement (CLAUDE.md §7). Walks UP the decoding ladder from the
// easiest skill; a child must pass PER_SKILL items at a level to advance. Placement
// stops at the first level they can't pass — that becomes their entry (instructional
// level, decoupled from chronological P-level). Short (≤ MAX_ITEMS), low-pressure,
// no right/wrong feedback shown during the walk (that's enforced in the UI).
import type { SkillDef } from '../types'
import { SKILLS } from './packs'

// The decoding ladder = phonics decode skills that have an encode partner (the
// dual-gated pattern skills), in scope order. Excludes HF-words (no encode pair).
export const decodeLadder: SkillDef[] =
  SKILLS.filter(s => s.strand === 'phonics' && s.itemType === 'decode_choice' && !!s.encodePairId)

export const PER_SKILL = 2
export const MAX_ITEMS = 15

export interface PlaceResult { skillId: string; correct: boolean }

// The lowest ladder skill not yet passed (needs more items, or failed here).
function lowestUnpassed(results: PlaceResult[]): string {
  for (const s of decodeLadder) {
    const r = results.filter(x => x.skillId === s.id)
    if (r.length < PER_SKILL || r.filter(x => x.correct).length < PER_SKILL) return s.id
  }
  return decodeLadder[decodeLadder.length - 1].id
}

// Given the results so far, decide the next step: draw another item from `skillId`,
// or finish and place the child at `entrySkillId`.
export function nextPlacement(results: PlaceResult[]): { done: boolean; skillId?: string; entrySkillId?: string } {
  if (results.length >= MAX_ITEMS) return { done: true, entrySkillId: lowestUnpassed(results) }
  for (const s of decodeLadder) {
    const r = results.filter(x => x.skillId === s.id)
    if (r.length < PER_SKILL) return { done: false, skillId: s.id }
    if (r.filter(x => x.correct).length < PER_SKILL) return { done: true, entrySkillId: s.id }
  }
  return { done: true, entrySkillId: decodeLadder[decodeLadder.length - 1].id }
}

// Skills to mark mastered on placement: every ladder skill BELOW the entry level,
// plus their encode partners (the child already reads/spells those).
export function priorSkillIds(entrySkillId: string): string[] {
  const idx = decodeLadder.findIndex(s => s.id === entrySkillId)
  if (idx <= 0) return []
  return decodeLadder.slice(0, idx).flatMap(s => s.encodePairId ? [s.id, s.encodePairId] : [s.id])
}
