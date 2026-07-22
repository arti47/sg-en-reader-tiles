// Phonemic-awareness lookup (§3 audit). PA is a Learn-ONLY teaching activity (oral blend/segment)
// — it is deliberately NOT a scope skill in the Test engine, so it never gates or gets assessed.
// LearnRunner pulls PA items directly from here for the early CVC sub-units, where phonemic
// awareness is the foundation a weak/dyslexic reader most needs before grapheme work.
import type { ContentPack, PackItem } from '../types'
import paCvc from '../data/packs/pa-cvc.json'

const PA_PACK = paCvc as ContentPack

// The patterns whose Learn unit opens with a phonemic-awareness warm-up (the satpin CVC sub-units).
const PA_PATTERNS = new Set(['PH-cvc-1', 'PH-cvc-2', 'PH-cvc-3', 'PH-cvc-4'])

export function hasPA(patternId: string): boolean {
  return PA_PATTERNS.has(patternId)
}

// PA items for a pattern (empty when the pattern has no PA warm-up). LearnRunner samples a few.
export function paItemsFor(patternId: string): PackItem[] {
  return PA_PATTERNS.has(patternId) ? PA_PACK.items : []
}
