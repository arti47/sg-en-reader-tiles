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
  | 'editing_mcq'       // sentence with one error → pick the correction (MCQ, no keyboard)
  | 'synthesis_mcq'     // pick the correctly combined/rewritten sentence (MCQ)
  // ---- Phonemic awareness (oral, audio-only, MCQ; Learn-only, §3) ----
  | 'pa_blend'          // hear separated phonemes in sequence → pick the blended word
  | 'pa_count'          // hear a word → pick how many sounds it has

export type Strand = 'phonics' | 'spelling' | 'grammar' | 'vocab' | 'comprehension' | 'cloze' | 'sentence' | 'reading' | 'pa'
export type Difficulty = 1 | 2 | 3

export interface Choice { id: string; label: string; keyword?: string } // keyword = optional scaffold anchor (e.g. letter 'a' → "ant")

export interface PackItem {
  id: string
  skillId: string
  itemType: ItemType
  difficulty: Difficulty
  stem: string
  audioText?: string             // what TTS speaks (defaults to displayWord)
  phonemeId?: string             // isolated-phoneme clip id (§6c) — prompt plays audio.phoneme(), not TTS
  phonemeSeq?: string[]          // pa_blend: phoneme clip ids played in sequence (hear the sounds → blend)
  displayWord?: string           // target word (encode items)
  graphemes?: string[]           // tile segmentation, e.g. "ship" → ["sh","i","p"]
  distractorGraphemes?: string[] // confusable tiles added to tray
  words?: { text: string; graphemes: string[]; distractorGraphemes?: string[] }[] // dictation: per-word tiles
  passage?: string               // context shown above the question (comprehension/cloze)
  choices?: Choice[]
  correctChoiceId?: string
  wordBank?: string[]            // grammar_cloze: lettered bank, each used once
  blanks?: { id: string; acceptable: string[] }[] // grammar_cloze: per-blank accepted answers
  heart?: string                 // "heart word" irregular part to remember (HF sight words, §5 heart-word method)
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
  threaded?: boolean             // served on a cadence throughout every session (e.g. HF sight words, §5/§6d), not via the eligible rotation
  mastery: { window: number; accuracyToPass: number; minItems: number }
}

// ---- Persistence (§11) ----
export type DifficultyFlag = 'decoding' | 'fluency' | 'vocab' | 'comprehension' | 'dyslexia'
export interface Child {
  id: string
  name: string
  pLevel: 1 | 2 | 3 | 4 | 5 | 6
  entrySkillId?: string
  difficultyFlags?: DifficultyFlag[]   // optional, captured at add-time (§14) — teacher context
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
  // True when this item was a non-assessment REP — an interleaved review, HF thread, fluency
  // speed rep, due SRS review, post-lesson guided item, or a struggle down-shift to an easier
  // prerequisite. These are deliberately easy (difficulty-1, mastered/prereq skills), so they
  // must be EXCLUDED from the headline "recent accuracy"/readiness signals or they inflate them
  // (a struggling child looks fine because half the recent items were trivial). Per-skill mastery
  // is unaffected — it already scopes to one skill. Absent on legacy rows ⇒ treated as assessment.
  review?: boolean
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
// Per (child, calendar-day) rollup — feeds the daily view of the trend chart (§11).
export interface Daily { childId: string; day: string; items: number; correct: number; minutes: number }
// Usage/fidelity mechanic (§14) — sessions toward a weekly target + streak.
export interface Usage { childId: string; weeklySessionTarget: number; sessionsThisWeek: number; weekKey: string; streakWeeks: number; lastSessionTs: number }
// Global settings (§11).
export interface Settings { pin?: string; ttsRate: number; englishVariant: 'en-SG'; sessionLength: number; font?: 'lexend' | 'dyslexic'; voiceURI?: string;
  // M6 (§20): sound effects on by default, ambient music off by default, calm mode dials
  // animation + sound down globally (dyslexia-safe). Absent = default.
  sfx?: boolean; music?: boolean; calmMode?: boolean }

// M6 (§20.7) Star Coins wallet — additive reward state, never affects pedagogy.
export interface Wallet { childId: string; coins: number; lifetimeCoins: number }
export interface Review {
  skillId: string
  due: number                    // next review timestamp
  stage: number                  // 0,1,2 → +2d,+7d,+21d; graduates after the last
  status: 'scheduled' | 'graduated'
}

// ---- M5 Learn/Test dual-mode (§19). Per (child, pattern) learn state; a pattern is
// identified by its phonics DECODE skill id. `mastered` is NOT stored here — it is derived
// from `progress`/`certificates` (one source of truth). DB v6 `learn` store. ----
export interface LearnState {
  patternId: string              // the pattern's decode skill id (e.g. PH-cvc-short-vowels)
  learned: boolean               // Learn unit completed (or placement-credited) → unlocks Test
  needsReview: boolean           // Test flagged struggle on a learned pattern → Learn resurfaces it
  learnedAt?: number
  flaggedAt?: number
}
// Derived per-pattern status shown in the Learn map (§19.3), in order.
export type PatternStatus = 'not-started' | 'learning' | 'learned' | 'mastered' | 'needs-review'
