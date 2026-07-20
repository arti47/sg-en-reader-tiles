// M1: tile-based decode/encode + adaptive engine (CLAUDE.md §6, §7, §11).
export type ItemType =
  | 'grammar_mcq'
  | 'decode_choice'   // read word → pick correct spelling/meaning (MCQ, TTS prompt)
  | 'build_word'      // hear word → assemble grapheme tiles (encode)
  | 'spell_tiles'     // tray-based encode (same renderer as build_word)

export type Strand = 'phonics' | 'spelling' | 'grammar' | 'vocab'
export type Difficulty = 1 | 2 | 3

export interface Choice { id: string; label: string }

export interface PackItem {
  id: string
  skillId: string
  itemType: ItemType
  difficulty: Difficulty
  stem: string
  audioText?: string             // what TTS speaks (defaults to displayWord)
  displayWord?: string           // target word (encode items)
  graphemes?: string[]           // tile segmentation, e.g. "ship" → ["sh","i","p"]
  distractorGraphemes?: string[] // confusable tiles added to tray
  choices?: Choice[]
  correctChoiceId?: string
  missedConceptOnFail: string    // error-taxonomy enum
  rationale: string
  decodableWithin?: string       // skillId envelope (§6a)
}

export interface Lesson {
  iCanStatement: string
  explanation: string
  workedExamples: { text: string; note: string }[]
}

export interface ContentPack {
  packId: string
  strand: Strand
  skillIds: string[]
  version: number
  items: PackItem[]
  lessons?: Record<string, Lesson>
}

// ---- Scope & sequence (subset used at runtime) ----
export interface SkillDef {
  id: string
  strand: Strand
  objective: string
  iCanStatement: string
  prereqs: string[]
  itemType: ItemType
  itemPool: string               // packId
  encodePairId?: string          // dual-gate partner (phonics ↔ spelling)
  mastery: { window: number; accuracyToPass: number; minItems: number }
}

// ---- Persistence (§11) ----
export interface Child {
  id: string
  name: string
  pLevel: 1 | 2 | 3 | 4 | 5 | 6
  entrySkillId?: string
  createdAt: number
}
export interface Attempt {
  id: string                     // uuid (was keyed by ts — collision risk)
  childId: string
  skillId: string
  itemId: string
  correct: boolean
  difficulty: Difficulty
  missedConcept?: string
  latencyMs: number
  ts: number
}
export interface SkillProgress {
  skillId: string
  status: 'locked' | 'active' | 'mastered'
  itemsAnswered: number
  rollingAccuracy: number
  difficulty: Difficulty
  lastSeen: number
  masteredAt?: number
}
export interface Certificate { skillId: string; iCanStatement: string; awardedAt: number }
