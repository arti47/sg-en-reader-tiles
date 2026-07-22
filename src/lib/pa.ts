// Phonemic-awareness lookup (§3 audit). PA is a Learn-ONLY teaching activity (oral blend/segment)
// — it is deliberately NOT a scope skill in the Test engine, so it never gates or gets assessed.
// LearnRunner pulls PA items directly from here for the early units, where phonemic awareness is
// the foundation a weak/dyslexic reader most needs: CVC (blend/segment single sounds) and digraphs
// (a digraph is ONE sound — ship = /sh/ /i/ /p/ = 3 sounds, not 4).
import type { ContentPack, PackItem } from '../types'
import paCvc from '../data/packs/pa-cvc.json'
import paDigraphs from '../data/packs/pa-digraphs.json'

// pattern id → the PA pack whose items warm up that unit's Learn walk.
const PA_BY_PATTERN: Record<string, ContentPack> = {
  'PH-cvc-1': paCvc as ContentPack, 'PH-cvc-2': paCvc as ContentPack,
  'PH-cvc-3': paCvc as ContentPack, 'PH-cvc-4': paCvc as ContentPack,
  'PH-digraphs': paDigraphs as ContentPack
}

export function hasPA(patternId: string): boolean {
  return patternId in PA_BY_PATTERN
}

// PA items for a pattern (empty when the pattern has no PA warm-up). LearnRunner samples a few.
export function paItemsFor(patternId: string): PackItem[] {
  return PA_BY_PATTERN[patternId]?.items ?? []
}
