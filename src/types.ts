// M1: tile-based decode/encode + adaptive engine (CLAUDE.md §6, §7, §11).
export type ItemType =
  | 'grammar_mcq'
  | 'decode_choice'   // read word → pick correct spelling/meaning (MCQ, TTS prompt)
  | 'build_word'      // hear word → assemble grapheme tiles (encode)
  | 'spell_tiles'     // tray-based encode (same renderer as build_word)
  | 'dictation'      // hear a short decodable sentence → build it word-by-word from tiles (§6)
  // ---- M3 PSLE Paper-2 (MCQ + word-bank; free-text types deferred, §2/§6) ----
  | 'vocab_mcq'         // sentence; pick best-meaning / closest synonym (MCQ)
  | 'vocab_cloze_mcq'   // short passage with a blank; MCQ options
  | 'passage_question'  // short passage + question (MCQ only)
  | 'visual_text'       // described poster/advert + question (MCQ)
  | 'grammar_cloze'     // passage with blanks + a lettered word bank, each used once

export type Strand = 'phonics' | 'spelling' | 'grammar' | 'vocab' | 'comprehension' | 'cloze'
export type Difficulty = 1 | 2 | 3

export interface Choice { id: string; label: string }

export interface PackItem {
  id: string
  skillId: string
  itemType: ItemType
  difficulty: Difficulty
  stem: string
  audioText?: string             // what TTS speaks (defaults to displayWord)
  phonemeId?: string             // isolated-phoneme clip id (§6c) — prompt plays audio.phoneme(), not TTS
  displayWord?: string           // target word (encode items)
  graphemes?: string[]           // tile segmentation, e.g. "ship" → ["sh","i","p"]
  distractorGraphemes?: string[] // confusable tiles added to tray
  words?: { text: string; graphemes: string[]; distractorGraphemes?: string[] }[] // dictation: per-word tiles
  passage?: string               // context shown above the question (comprehension/cloze)
  choices?: Choice[]
  correctChoiceId?: string
  wordBank?: string[]            // grammar_cloze: lettered bank, each used once
  blanks?: { id: string; acceptable: string[] }[] // grammar_cloze: per-blank accepted answers
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
  enabled?: boolean              // false = authored but inert (e.g. T01 pending phoneme audio); default enabled
  ladder?: boolean               // reserved: reading-level rung marker
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

// ---- M2 analytics (§10, §11) ----
// Per (child, ISO-week, skill) rollup — never rolled off; feeds the trend chart.
export interface Aggregate { childId: string; week: string; skillId: string; items: number; correct: number; minutes: number }
// Usage/fidelity mechanic (§14) — sessions toward a weekly target + streak.
export interface Usage { childId: string; weeklySessionTarget: number; sessionsThisWeek: number; weekKey: string; streakWeeks: number; lastSessionTs: number }
// Global settings (§11).
export interface Settings { pin?: string; ttsRate: number; englishVariant: 'en-SG'; sessionLength: number; font?: 'lexend' | 'dyslexic' }
export interface Review {
  skillId: string
  due: number                    // next review timestamp
  stage: number                  // 0,1,2 → +2d,+7d,+21d; graduates after the last
  status: 'scheduled' | 'graduated'
}
