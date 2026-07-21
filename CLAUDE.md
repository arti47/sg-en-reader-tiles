# CLAUDE.md — Adaptive English Tutor for Singapore Primary (P1–P6) — "PrimaryEnglish"

> **Purpose of this file.** Single source of truth for an AI coding agent (or human dev) building a personal, Core5-style adaptive English tutor for a small group of **Singapore primary school children (P1–P6)**, aligned to the **MOE English Language Syllabus 2020 / STELLAR 2.0** and preparing toward **PSLE English**. Read top to bottom before coding. Build in the phase order in §15. When ambiguous, prefer the choice that keeps the app **pedagogically sound, PSLE-aligned, self-contained, and simple to run at home**.

---

## 1. Project Overview

**What we are building.** A self-adapting English tutor for **Singapore Primary 1–6 (ages ~7–12)**, modeled on the adaptive/blended engine of Lexia Core5 but **localised to the Singapore MOE curriculum and PSLE**, for **personal/home use with a small group of children**.

**Primary audience: students with literacy difficulties (incl. dyslexia).** Confirmed profile: **decoding + spelling difficulties (reading and spelling)**. This is the central design driver. Consequences (enforced throughout): Structured Literacy / Orton-Gillingham is **mandatory, not optional**; **every phonics pattern is taught for BOTH reading (decoding) and spelling (encoding)**; **reading level is decoupled from P-level** (a P5 child may need P1–2 decoding); pacing is **slower with smaller steps and more review**; content is **decodable/controlled** (§6a); UI is **dyslexia-friendly by default** (§14); tone foregrounds **growth over exam pressure** (§10).

**Add-Student is a first-class in-app feature** (not hardcoded profiles): the parent adds a child, sets **chronological P-level**, and the app then runs an **independent reading placement** (§7). Optional difficulty flags captured at add-time tune starting focus.

**Two things Core5's model gives us, kept:** (a) an adaptive engine with continuous embedded assessment ("Assessment Without Testing"), and (b) a blended loop that branches to explicit re-teaching when a child struggles. **What we change:** the *content and assessment* are rebuilt around the MOE EL Syllabus 2020 strands and PSLE Paper components, in **British/Singapore English**, for a **largely bilingual (English + Mother Tongue) learner population**.

**The core loop.**
1. Each child has a profile and a placement on a fixed **P1→P6 scope-and-sequence**.
2. The app presents short, adaptive **activities** using **PSLE-style item types**.
3. Every answer is **continuously scored (deterministic)** → per-skill **mastery estimate** (no separate test).
4. On mastery → advance; on struggle → branch to an explicit **Lesson**, then extra **Practice**.
5. A **parent dashboard** shows progress, an **action plan**, and a **PSLE-readiness indicator** framed on the AL1–AL8 scale.

**The key architectural bet: FULLY OFFLINE, ZERO RUNTIME AI.**
- **No network access and no AI calls at runtime.** All content ships as **static, pre-authored content packs** (JSON + audio assets) bundled with the app.
- Content packs are **authored/pre-generated at BUILD time** (curated word lists for phonics/spelling; AI may assist authoring offline before shipping, but the shipped app is static).
- **All scoring is deterministic** (exact-match / rule-based). No LLM scoring. Free-text comprehension is deferred or MCQ-only.
- **Lessons are pre-written** per skill and shipped in the pack.
- Rationale: the MVP is decoding+spelling, whose item space is finite and enumerable — hardcoded curated lists give guaranteed decodability, correct keys, zero cost, and permanent offline operation on iPad/iPhone.

---

## 2. Non-Goals (scope discipline)

Do **not** build unless later asked:
- **Any runtime network dependency or AI/LLM call.** The app must function fully in airplane mode.
- Multi-tenant accounts, school/teacher admin hierarchies, roles/permissions.
- User authentication / cloud accounts (Phase 1 is local-device only).
- Payment, licensing, or data-compliance infrastructure — personal use.
- **Composition / Continuous & Situational Writing marking** (PSLE Paper 1) — hard to auto-mark reliably; spec'd as a **later, optional** module.
- **Oral (Reading Aloud + Stimulus-based Conversation)** and **Listening Comprehension audio** — require speech I/O; **Phase 3, optional**.
- A pixel clone of Core5. We target a **PSLE-aligned viable core** and expand.

---

## 3. Pedagogical Foundation

Two frameworks combine: **MOE EL Syllabus 2020 / STELLAR 2.0** (the *what* — content, strands, values) and **Structured Literacy** (the *how* — the adaptive/explicit engine, especially for lower-primary foundations).

**Structured Literacy principles → features:**

| Principle | Meaning | Where in app |
|---|---|---|
| **Explicit** | Rules taught directly, not guessed | Lessons state the rule before practice (§8) |
| **Systematic** | Simple → complex, valid order | Fixed P1→P6 scope-and-sequence (§4) |
| **Cumulative** | New builds on prior; constant review | Interleaved review / spaced repetition (§7) |
| **Diagnostic** | Continuously find each child's gaps | Assessment Without Testing (§9) |
| **Responsive** | Adjust in real time | Adaptive engine (§7) |

**Strands (localised).** The MOE syllabus organises learning into Listening & Viewing, Reading & Viewing, Speaking & Representing, Writing & Representing, and **Grammar & Vocabulary** as knowledge about language. For an auto-adaptive app we implement these **six teachable strands**, weighted toward what PSLE Paper 2 actually tests:

1. **Phonics & Word Recognition (decoding)** — sound–letter correspondences, decodable words, high-frequency words. **MVP core.** *Does NOT taper by grade — serve by reading placement, not P-level.*
2. **Spelling (encoding)** — the reverse operation of every phonics pattern: hear word → build/type it. Taught in lockstep with strand 1 (OG: read it AND spell it before mastery). Includes dictation of decodable words/sentences. **MVP core.**
3. **Grammar** — tenses, subject–verb agreement, prepositions, connectors, pronouns, articles, reported speech, verbs of perception, gerunds. *Major PSLE weight; post-MVP emphasis.*
4. **Vocabulary** — word meaning, nuance, phrasal verbs, collocations, idioms, context clues.
5. **Cloze** — grammar cloze (word-bank) and comprehension cloze (open). *Own strand; upper-primary.*
6. **Comprehension** — literal → inferential → evaluative; visual text; open-ended technique.
7. **Sentence Manipulation** — Synthesis & Transformation; Editing (spelling & grammar).

**EAL / bilingual reality.** English is the medium of instruction but often **not the home language** (many children speak Mandarin, Malay, or Tamil at home). Do **not** assume English L1: gloss harder vocabulary, keep instructions simple, and let vocabulary support scaffold meaning.

**Motivation as a feature.** Learner agency + growth mindset; celebrate mastery with certificates carrying **"I can…" statements**; encouraging, non-punitive feedback; short sessions.

---

## 4. Localisation & PSLE Alignment (READ — drives content generation and scoring)

**Language conventions (mandatory in every generated item and in scoring):**
- **British/Singapore English spelling** — colour, favourite, realise, centre, travelled, neighbour. **Never** mark US spellings as the *only* correct form; never generate US spellings as targets.
- **Singapore context** — local names (e.g., Wei Ming, Siti, Kavitha, Mr Tan), settings (hawker centre, MRT, void deck, HDB, wet market, CCA), currency in dollars/cents. Keep culturally neutral and inclusive across races.
- **Register** — "internationally acceptable English that is grammatical and appropriate"; avoid Singlish as a *target answer* (may appear only as an editing/error example to correct).

**PSLE English structure the app builds toward** (from the SEAB PSLE English syllabus; use for component coverage and the readiness indicator, not for exact mark replication):

| Paper | Component | Format | In-app coverage |
|---|---|---|---|
| **P1 Writing (25%)** | Situational + Continuous Writing | open | **Later/optional** (§2) |
| **P2 Language Use & Comprehension (45%)** | Grammar MCQ | MCQ | Grammar strand |
| | Vocabulary MCQ | MCQ | Vocabulary strand |
| | Vocabulary Cloze | MCQ | Vocabulary strand |
| | Visual Text Comprehension | MCQ | Comprehension strand |
| | Grammar Cloze (word bank) | open | Cloze strand |
| | Editing (spelling & grammar) | open | Sentence-manipulation strand |
| | Comprehension Cloze (no word bank) | open | Cloze strand — acceptable-list scored |
| | Synthesis & Transformation | open | Sentence-manipulation — pattern-scored |
| | Comprehension (open-ended) | open | Comprehension — MCQ-adapted |
| **P3 Listening (10%)** | Listening Comprehension | MCQ | **Phase 3** (audio) |
| **P4 Oral (20%)** | Reading Aloud + Conversation | open | **Phase 3** (speech) |

Grading is reported as **Achievement Levels AL1 (best) → AL8**. The readiness indicator (§10) is framed on this scale.

**Support-programme analogy (validates the tiered model).** MOE runs Learning Support Programme (P1–2), Empowered to Read Too (P1–2), and School-based Dyslexia Remediation (P3–4). Our struggle-branch (Lesson → Practice) mirrors this "extra explicit support when stuck" idea.

---

## 5. The Scope & Sequence (fixed backbone)

Hand-authored spine stored as **JSON**, edited without touching logic. Content packs supply items *within* a skill; nothing sets skill order but this file. Levels map to **P1–P6**; skills within a level are ordered and gated by `prereqs`.

```jsonc
// scopeAndSequence.json  (excerpt — expand to full P1–P6)
{
  "levels": [
    {
      "id": "P1", "name": "Primary 1", "ageBand": "6-7",
      "skills": [
        {
          "id": "PH-short-vowels",
          "strand": "phonics",
          "objective": "Decode CVC words with short vowels.",
          "iCanStatement": "I can read short-vowel words.",
          "prereqs": [],
          "itemType": "decode_choice",
          "itemPool": "phonics-L01-cvc",
          "mastery": { "window": 12, "accuracyToPass": 0.85, "minItems": 10 }
        },
        {
          "id": "GR-articles",
          "strand": "grammar",
          "objective": "Choose a / an / the correctly.",
          "iCanStatement": "I can use a, an and the correctly.",
          "prereqs": [],
          "itemType": "grammar_mcq",
          "itemPool": "grammar-L01-articles",
          "mastery": { "window": 12, "accuracyToPass": 0.8, "minItems": 10 }
        }
      ]
    }
    // P2 ... P6 (increasing complexity; PSLE-component skills concentrate in P4–P6)
  ]
}
```

**Suggested progression by strand (compress/expand as needed):**
- **Phonics/decoding (MVP):** letter–sounds → short vowels (CVC) → digraphs (sh, ch, th, ck) → blends (initial → final) → FLOSS/doubling → long vowels (silent-e) → vowel teams → r-controlled → diphthongs → 2-syllable words (syllable division) → prefixes/suffixes. High-frequency ("tricky") word sets threaded throughout.
- **Spelling/encoding (MVP):** mirrors phonics 1:1 — each pattern gets `build_word` (tiles) → `spell_tiles` → `dictation` (tiles) items. Mastery of a pattern requires BOTH decode and encode gates (§7).
- **Grammar (P1→P6):** articles → nouns/pronouns → subject–verb agreement (simple → neither/nor, collective) → tenses → prepositions → connectors → reported speech → perception verbs, gerunds, modals.
- **Vocabulary:** picture–word → synonyms/antonyms → shades of meaning → phrasal verbs → collocations → idioms → contextual choice.
- **Cloze (P3→P6):** grammar cloze (word bank) → comprehension cloze (short) → PSLE-length.
- **Comprehension:** sentence meaning → literal → inference → cause/effect → evaluative → visual text → open-ended technique. *Passages decodability-constrained (§6a).*
- **Sentence manipulation (P3→P6):** editing (spelling) → editing (grammar) → synthesis & transformation.

**Authoring rule:** ship a complete sequence for **Phonics + Spelling** first (the Phase-1 MVP core), with a starter Grammar/Vocab track for variety. PSLE Paper-2 strands (cloze, comprehension, synthesis) follow in M3 — they are unreachable for a child who cannot yet decode them.

---

## 6. Content Model (item types)

Each skill declares an `itemType`. Renderers to implement:

| itemType | Renders | Answer | Scoring |
|---|---|---|---|
| `decode_choice` | Word + audio "read this" + choices, or match word to picture | tap | exact |
| `sight_word_flash` | Word shown briefly; pick from choices | tap, timed | accuracy + latency |
| `grammar_mcq` | Sentence with 4 options (the PSLE grammar MCQ) | tap | exact |
| `vocab_mcq` | Sentence; pick best-meaning word / closest synonym of an underlined word | tap | exact |
| `vocab_cloze_mcq` | Short passage, blanks, MCQ options | tap per blank | exact |
| `grammar_cloze` | Passage with blanks + a **lettered word bank**, each used once | assign words | exact |
| `editing` | Passage with underlined errors; supply correction | short text | exact vs authored key |
| `comprehension_cloze` | Passage, blanks, **no word bank** | short text per blank | matches authored `acceptable[]` lists |
| `synthesis_transform` | Rewrite/combine sentence(s) in required form | text | matches authored `acceptable[]` patterns (deferred if too brittle) |
| `visual_text` | Generated poster/advert description + question | MCQ | exact |
| `passage_question` | Short passage + question | **MCQ only** (free-text deferred — no AI scorer) | exact |
| `build_word` | Hear word (audio) → drag letter/grapheme tiles to spell it | ordered tiles | exact + **error analysis** (which grapheme missed → missedConcept) |
| `spell_tiles` | Hear word → build from letter/grapheme tile tray | ordered tiles | exact + error analysis |
| `dictation` | Hear short decodable sentence → build word-by-word from tile trays | ordered tiles per word | per-word scoring; rule-based error analysis |

### 6a. Decodability constraint (mandatory, enforced at AUTHORING time)
Every word/sentence in a skill's item pool must be decodable using only patterns taught at or before that skill, plus that skill's allowed high-frequency word list. Enforced by a **build-time lint script** that parses each word against the taught-pattern set and fails the build on violations. Each item carries `decodableWithin: skillId` metadata.

### 6b. Content pack QA (build-time, replaces runtime validator)
A build script validates every pack: (1) answer keys resolve, (2) exactly one correct answer per item, (3) en-SG spelling (dictionary check), (4) decodability lint (§6a), (5) no duplicate item IDs, (6) minimum pool size per skill (≥20 items/difficulty where feasible). CI-style: build fails on any violation.

### 6c. Audio strategy (fully offline)
iOS `speechSynthesis` with an **on-device en-GB voice** for words/sentences — works offline. Isolated phonemes (/sh/, /a/) cannot be TTS'd reliably: bundle a **pre-recorded phoneme set (~44 clips)** as static assets. `audio.phoneme(id)` plays clips; `audio.speak(text)` uses TTS. One service interface; assets cached by the service worker.

### 6d. Item pools & variety (replaces infinite generation)
Each skill ships a **pool of 20–40 hand-curated items per difficulty**. Runtime variety via: shuffle, distractor rotation (distractor sets stored per item, sampled), and never repeating an item within its pool cycle. Pool exhaustion recycles with reshuffle — acceptable given spaced repetition spreads exposure.

> **Owner directive (2026-07-20) — MAX OUT EVERY PHONICS PACK.** For all phonics/spelling packs (T01–T12: CVC, digraphs, **blends**, FLOSS, silent-e, vowel teams, r-controlled, diphthongs, two-syllable, HF sets), author to the **quality ceiling** of that pattern (as many decodable, en-SG, child-safe words as the pattern cleanly yields — typically ~60 items/skill), not merely the §6d floor. Applies to every future pack **when building blends and beyond** — always go to max before requesting owner sign-off. Precedent: CVC 60, digraphs 60.

**Multisensory (OG requirement):** pair sound + visual + motor (tile drag, typing) for every phonics/spelling pattern.

---

## 7. Adaptive Engine

**Mastery model.** Rolling-window accuracy per (child, skill), gated by `minItems`. (Interface kept clean so a Bayesian/BKT upgrade can drop in later.)

**Difficulty (1–3) within a skill.** Start at 1. Correct streak of 3 → +1 (cap 3); 2 wrong in recent window → −1 (floor 1). Difficulty flows into generation (harder distractors, subtler nuance, longer/lower-frequency vocabulary, PSLE-length passages at level 3).

**Dual mastery gates (phonics patterns).** A pattern is mastered only when BOTH its decode skill and its encode (spelling) skill pass. Encode unlocks after decode reaches ~70% over **≥6 real items** (`ENCODE_UNLOCK_MIN`, so a 3/3 fluke doesn't open spelling early), but advancement requires both. **Massed practice first:** threading + interleave are suppressed until the child's first pattern is acquired. `minItems` for foundational decode/encode is **12** (overlearning for struggling readers; 85%×12 ≈ 11/12).

**Mastery = RETENTION, not acquisition (OG, 2026-07-21).** Passing the dual gate in a session is **PROVISIONAL mastery**: it advances the ladder (keeps momentum) but the **certificate is WITHHELD** until the **first +2d spaced-review pass** confirms retention. So progress `status:'mastered'` = acquisition (drives advancement + the dashboard growth count); a **certificate = retained** (minted on the confirming review). Prevents the "certify now, maybe demote later" false-positive.

**Spaced repetition (replaces vague "review %").** On acquisition, schedule reviews at **+2d, +7d, +21d** for **BOTH the decode and encode skills** of the pattern. Session composition: due reviews first (cap ~4/session), then current-skill items. The certificate is minted only once **both channels have retained** (each review stage ≥1 — so spelling retention is verified, not assumed). A **failed review truly demotes**: it re-books the near review AND fires an immediate guided re-practice block (3 difficulty-1 items on the forgotten skill), not just a re-test in 2 days. Post-M4: tune intervals.

**Error taxonomy (missedConcept).** Fixed enum per strand — e.g. phonics: `digraph-sh`, `vowel-short-a`, `consonant-b` (b/d reversal), `r-controlled-ar`; spelling: `silent-e-a`, `vowel-team-choice`; grammar: `sva-neither-nor`. Drives struggle detection, Lesson targeting, and dashboard "stuck on" reporting. **Grapheme-level (2026-07-21):** for encode items, `scoring.tileMissedConcept` derives the tag from the EXPECTED grapheme at the first same-length SUBSTITUTION via `src/data/graphemeConcepts.json` (`gen-grapheme-concepts.mjs`), so a vowel confusion / digraph swap / b-d reversal is diagnosed precisely; length-mismatch errors (omission/insertion, e.g. a dropped silent-e) fall back to the item's authored `missedConceptOnFail`. MCQ/decode items keep their authored tag.

**Progression pseudocode:**
```
onAnswer(child, skill, item, result):
  record(result)                              # feeds AWT + mastery
  updateDifficulty(child, skill, result)
  m = rollingAccuracy(child, skill, window)
  n = itemsAnswered(child, skill)
  if n >= skill.mastery.minItems and m >= skill.mastery.accuracyToPass:
      markProvisionalMastery(child, skill)    # advances the ladder now…
      scheduleReview(child, skill, +2d)       # …cert WITHHELD until this review passes (§ retention)
      advance(child, nextUnlockedSkill(child))   # respects prereqs
  elif strugglingSignal(child, skill):        # m < 0.6 over >= 5 items, or 2 same-concept misses
      branchToLesson(child, skill)            # may re-fire once more (cap 2/skill/session) if still failing
  else:
      continuePractice(child, skill)
```

**Struggle branching (blended-model equivalent):** re-teach EARLY to minimise error exposure — Lesson (explicit rule + worked examples + guided items) → Practice (easier extra items) → resume. The lesson may re-fire **once more** (cap 2/skill/session, after ≥3 further failed attempts) if the child is still struggling.

**Immediate error correction (OG, 2026-07-21).** At the item level, a WRONG answer is scored (assessment) but does NOT end the item: every renderer reveals + **voices** the correct answer and requires the child to **reproduce it correctly** (tap the right choice / rebuild the modelled word / re-place the right cloze word) before continuing — so the last production is correct, not the error (avoids consolidating the wrong form). `onAnswer` is deferred until the fix, carrying the first attempt, so score + correct-only fluency latency are unaffected; the placement warm-up (`quiet`) stays assessment-only.

**Placement (dual — critical for this audience).** Capture **chronological P-level** at add-time (sets PSLE-component expectations), then run an **independent reading placement** that finds true instructional level per strand by walking **down** on failure / **up** on success. For struggling readers these diverge — place content by **reading level, not P-level**. Start decoding placement low and confirm foundations before advancing. Keep placement short (≤ ~15 items) and low-pressure: **frame it as a warm-up game, show no right/wrong feedback during placement**, end on an achievable item. **Spelling is NOT free-placed (2026-07-21):** the warm-up only tests decoding, so a high placement credits the lower rungs' decode+encode but **holds back the top TWO read rungs' spelling** — the child must earn those in-session before advancing (`encodeUnlocked` treats a placement-confirmed decoder as ≥70%). Spelling lags decoding in dyslexia, so a decode-only placement never assumes more than two rungs of spelling. Placement itself needs **3/3 per level** (not 2) so lucky guesses can't over-place.

**Interleaving:** ~15–20% of session items are quick reviews of mastered skills (cumulative principle).

---

## 8. Lessons (explicit re-teaching)

**Pre-written per skill, shipped in the content pack** (finite: ~40–60 skills). Served on struggle. Contract:
```ts
type Lesson = {
  iCanStatement: string;
  explanation: string;              // plain, kid-friendly rule; en-SG
  workedExamples: { text: string; note: string }[];
  guidedItems: GeneratedItem[];     // 2–3 scaffolded, easier items
};
```
Example (subject–verb agreement, "neither…nor"): rule stated simply → worked examples showing the verb agrees with the nearer noun → guided items.

---

## 9. Assessment Without Testing (AWT)

No separate test — every attempt is an assessment event:
```ts
type Attempt = {
  childId: string; skillId: string; itemId: string;
  correct: boolean; partial: boolean; latencyMs: number;
  difficulty: 1|2|3; missedConcept?: string; ts: number;
};
```
The `Attempt` stream feeds mastery (§7), the readiness indicator (§10), the action plan (§11), and struggle detection. Persist every attempt.

---

## 10. PSLE-Readiness Indicator

Transparent, non-alarming, framed on **AL1–AL8** (not a verdict on the child):
```
inputs: pace (skills mastered / active week),
        recentAccuracy (last ~30 attempts),
        coverage (% of current-level PSLE-component skills mastered)

status = On-Target (green) | Some-Risk (amber) | High-Risk (red)   # traffic-light, mirrors Core5
projectedBand = coarse AL estimate from coverage + accuracy across P2 components
```
Show status + **one recommended action** (e.g. "focus grammar cloze — 3 sessions this week"). **For literacy-difficulty learners, foreground GROWTH (skills mastered, accuracy trend, weeks of progress) over the projected AL band** — the band is secondary context for the parent, never shown to the child. Keep honest and supportive.

---

## 11. Data Model & Persistence

**Phase 1:** **IndexedDB** (idb wrapper), per-device. Content packs are static bundle assets (not stored in DB).
```
schemaVersion                 → number                 (migration stub runs on load if < current)
profiles:index                → string[] childIds
profile:{childId}             → Child
progress:{childId}            → { [skillId]: SkillProgress }
attempts:{childId}            → Attempt[]              (raw, capped; roll off oldest, <5MB)
aggregates:{childId}          → per-skill/per-ISO-week rollups {items,correct,minutes} — NEVER rolled off; feeds trend charts
usage:{childId}               → { weeklySessionTarget:number, sessionsThisWeek:number, streakWeeks:number }
reviews:{childId}             → { [skillId]: nextReviewTs }
itemState:{childId}           → per-item exposure history (for no-repeat cycling, §6d)
certificates:{childId}        → Certificate[]
settings                      → { ttsRate, englishVariant:"en-SG", sessionLength }
```
```ts
type Child = { id:string; name:string; pLevel:1|2|3|4|5|6;   // chronological
  entrySkillId:string;                                       // from reading placement (may be << pLevel)
  difficultyFlags?:("decoding"|"fluency"|"vocab"|"comprehension"|"dyslexia")[];
  createdAt:number };
type SkillProgress = { skillId:string; status:"locked"|"active"|"mastered";
  itemsAnswered:number; rollingAccuracy:number; difficulty:1|2|3; lastSeen:number; masteredAt?:number };
type Certificate = { skillId:string; iCanStatement:string; awardedAt:number };
```
Provide **export/import** (JSON) since Phase-1 storage is device-bound.

---

## 12. Content Pack Spec (replaces runtime LLM)

**Packs are static JSON shipped with the app.** One pack per strand-level (e.g. `phonics-L03-digraphs.json`).

```ts
type ContentPack = {
  packId:string; strand:Strand; skillIds:string[]; version:number;
  items: PackItem[];                 // pre-authored, QA'd (§6b)
  lessons: { [skillId:string]: Lesson };  // pre-written explicit lessons
};
type PackItem = {
  id:string; skillId:string; itemType:ItemType; difficulty:1|2|3;
  stem:string; passage?:string; displayWord?:string;
  audioText?:string;                 // what TTS speaks (or phonemeId)
  choices?:{id:string;label:string}[];
  distractorPool?:string[];          // rotated at runtime for variety
  wordBank?:string[]; blanks?:{id:string;acceptable:string[]}[];
  correctChoiceId?:string; acceptableAnswers?:string[];
  missedConceptOnFail:string;        // from error taxonomy enum
  decodableWithin:string;            // skillId envelope (§6a)
  rationale:string;                  // shown as feedback/teaching note
};
```

**Authoring pipeline (build time, not runtime):**
1. Curated word lists per phonics/spelling pattern (source: standard OG/decodable lists, adapted to en-SG spelling).
2. Items assembled by script from word lists (decode_choice, build_word, spell_typed, dictation are template-driven — cheap to mass-produce deterministically).
3. Grammar/vocab MCQ and later-strand passages: authored with AI assistance **offline during development**, then human-reviewed, then frozen into packs.
4. §6b QA lint gates every pack into the build.
5. **Owner review gate:** every pack is delivered to the owner as readable JSON (+ a human-readable word-list summary) for review/edit BEFORE freezing into the app bundle. No pack ships unreviewed.

**Scoring (all deterministic):** exact match for MCQ/tiles; tile-sequence exact match for spelling; per-word tile match for dictation; cloze blanks match `acceptable[]` lists (author multiple acceptable answers where genuinely valid). Error analysis = rule-based: compare wrong grapheme/word against `missedConceptOnFail` + positional diff.


---

## 13. Architecture

**Distribution & updates (resolved).**
- **Hosting:** GitHub repo **`sg-en-reader-tiles`** → **GitHub Pages** (deploy from `main` via GitHub Actions on every push; Vite `base:'/sg-en-reader-tiles/'`; URL `https://<user>.github.io/sg-en-reader-tiles/`). Repo not yet created — README documents setup: create repo → push → Settings→Pages→Source: GitHub Actions. Workflow: all work merges to `main`; push = deploy.
- **Install:** open Pages URL in Safari on iPad/iPhone → **Add to Home Screen** → runs standalone, fully offline thereafter (service worker precaches shell + packs + audio).
- **Updates:** service-worker update flow — on load, `registration.update()`; when a new SW reaches `waiting`, show a **toast: "Update available — tap to refresh"**; tap → `postMessage({type:'SKIP_WAITING'})` → SW `skipWaiting()` → `controllerchange` → `location.reload()`. Never auto-reload mid-session (could lose an active session); toast persists until acted on. Also check for updates on `visibilitychange` (app foregrounded). Version string (from package.json) shown in parent dashboard footer for verification.
- **Content pack updates ride the same flow** (packs are precached assets; new SW = new packs).
- iOS note: if the PWA is unused for extended periods Safari may evict some storage — IndexedDB data survives in practice for installed PWAs, but the **export/import backup (§11) is the safety net**; remind parents to export periodically via a dashboard nudge.

**Phase 1 — offline-first PWA (BUILD FIRST).** Vite + React PWA. **Targets iPad/iPhone Safari**: add-to-home-screen, service worker precaches app shell + all content packs + phoneme audio → fully functional in airplane mode. Storage: **IndexedDB** (via idb wrapper). TTS: on-device `speechSynthesis` en-GB. No backend, no auth, no network calls ever. Touch-first UI (large tiles/targets); **ALL spelling input via on-screen tiles — no system keyboard anywhere** (uniform iPad/iPhone UX, no autocorrect interference, larger dyslexia-friendly targets). Tile tray = target graphemes + distractor tiles scaled by difficulty. **Granularity: GRAPHEME tiles** — digraphs/vowel teams/r-controlled units are single tiles ("sh", "ck", "ea", "ar"), reinforcing OG chunking. Each PackItem stores `graphemes:string[]` (the tile segmentation, e.g. "ship"→["sh","i","p"]); distractor tiles drawn from confusable graphemes ("ch" vs "sh", "ee" vs "ea") defined in the error taxonomy.

```
/domain   scopeAndSequence.json · mastery.ts · predictor.ts · placement.ts
/content  llm.ts · prompts/ · itemCache.ts · audio.ts
/state    storage.ts · profiles.ts · progress.ts · attempts.ts
/ui       ChildPicker · Placement · SessionRunner ·
          items/ (one renderer per itemType, §6) · LessonView · Certificate · ParentDashboard
/app      App.tsx (state machine / routing)
```

**Phase 2 — content expansion.** More packs (PSLE Paper-2 strands), better audio (recorded words for dictation where TTS quality falls short), multi-device export/import.

**Phase 3 — optional enrichments (may reintroduce connectivity as OPT-IN only).** Listening comprehension audio packs; oral reading via on-device speech recognition if feasible; nothing may break core offline operation.

---

## 14. UI / UX

**Child-facing:** big, low-clutter, audio-assisted for lower primary. Child picker (avatar tiles; each card has **Play** + **🏆 Trophies**) → Home (Play, strand chooser of *unlocked* strands, XP/streak, nearest certificate) → **Trophy room** (child-facing: level + XP bar, 6 badges earned/locked, earned "I can…" certificates — reachable from the picker and from the session summary; the session summary also highlights awards earned *that* session) → Session runner (one item at a time, large tap targets, immediate feedback, session progress dots, prompts read aloud) → Lesson view (visually distinct "we're learning something new") → Certificate (celebratory, savable/printable).

**Parent dashboard (PIN-gated):** per-child card (current reading level vs P-level, readiness traffic-light, **"N of M sessions this week" + weekly streak** — fidelity mechanic, mirrors Core5 usage targets; per-child `weeklySessionTarget`, default 4); **action plan** (one recommended action, stuck-on error tags, recent certificates); progress chart from `aggregates` (never truncated); export/reset.

**Add-Student flow:** from Child picker → "Add student" → enter name + chronological P-level + **optional difficulty flags (decoding/fluency/vocab/comprehension/dyslexia — built, stored on `Child.difficultyFlags`, shown as chips on the teacher dashboard)** → run reading placement → profile created. **Manage (built):** ChildPicker has a "Manage" toggle → per-child **Reset** (wipe progress/attempts/certs/reviews, clear entry skill, re-run placement) and **Remove** (delete profile + all data), each with an inline two-tap confirm (no native dialogs).

**Constraints — dyslexia-friendly by DEFAULT (not opt-in):** OpenDyslexic/sans-serif font, generous letter/line spacing, off-white background, high contrast, large tap targets, short lines, audio-first prompts, **no timing pressure by default** (sight-word timing is opt-in only), reduced-motion, adjustable TTS rate/session length. No ads, no external links, nothing unsuitable for children. Feedback is encouraging and never failure-framed; celebrate small wins.

---

## 15. Roadmap (build in order)

**M0 — Skeleton.** Shell, **add-student flow + profiles** + storage, TTS wrapper, one `grammar_mcq` item end-to-end. *Accept:* add a student with a P-level, answer one item, feedback shown, attempt persisted.

**M1 — MVP (decoding + spelling engine).** Full phonics + spelling scope-and-sequence with dual mastery gates; phoneme audio assets; `decode_choice`/`build_word`/`spell_tiles`/`dictation` tile renderers; content packs (curated word lists, §6b build-lint); placement (warm-up framing); struggle→Lesson→Practice; spaced repetition; certificates. *Accept:* a struggling reader is placed below P-level, works adaptively through patterns needing BOTH decode+encode to advance, gets re-taught on struggle, earns a certificate — fully offline.

**M2 — Dashboard + readiness. ✅ MET (2026-07-20).** AWT analytics, aggregates, usage targets/streak, action plan with error-tag reporting, AL-framed readiness (parent-only), export/import, schemaVersion migration stub (DB v4). *Accept:* accurate per-child status + one useful action — met: `ParentDashboard` (PIN-gated) shows growth stats + traffic-light status + a single next-step action from stuck-on tags, backed by `readiness.ts`/`aggregate.ts` and full-DB export/import; `npm test` drives the flow. *Note:* readiness coverage is over the decode+spell foundation only until M3 adds PSLE Paper-2 skills, so the AL band is a labelled early estimate.

**M3 — PSLE Paper-2 strands. ◑ CORE MET (2026-07-20).** Grammar, Vocabulary, Cloze, Comprehension (MCQ + word-bank acceptable-list scoring) shipped as a starter track (level P3, gated behind the decode ladder). `grammar_mcq`/`vocab_mcq`/`passage_question`/`visual_text` via `McqItem` (+passage), `grammar_cloze` via new `ClozeItem`. **Sentence Manipulation — MCQ-adapted forms now built** (T17, 2026-07-20): editing (spot-and-correct) + synthesis & transformation (pick the correct rewrite), strand `sentence`, deterministic/no-keyboard via `McqItem`. **Still open:** free-text synthesis + comprehension-cloze — free-text/no-keyboard, deferred per §2/§6. *Accept (met for the tractable strands):* all playable, validly sequenced behind decoding.

**M4 — Polish. ✅ CORE MET (2026-07-20).** Self-hosted dyslexia font (Lexend default + OpenDyslexic opt-in, `data-font`); parent Settings (font, voice **speed + voice picker**, session length) persisted + applied; gamification (`gamify.ts` — XP/level badge on picker, "+N XP" on summary, **six achievement badges** on the dashboard); background cache pre-warm on `visibilitychange`; a11y (labelled steppers, aria-live, focus-to-screen on view change). **Genuinely deferred:** threshold tuning against real use (needs the family's live data), daily-quest gamification, and `ui.ts` shared modal/toast primitives (no functional gap — dialogs are already non-native).

**Phase 2/3** per §13 once the family is using it and wants durability / audio / oral.

---

## 16. Open Decisions (confirm with owner)

1. **Exact P-levels of each child** — sets default placement bands.
2. **Number of children** — assume ≤ 6 (affects picker only). Devices: **iPad/iPhone (resolved)**.
3. **Printing** — printable certificates and PSLE-style practice sheets? If yes: Phase-1 print stylesheet + Phase-2 PDF export.
4. **Offline strictness** — how much must work with no connectivity (drives cache sizing)?
5. **Writing (Paper 1)** — in scope later, or leave out entirely?
6. **Oral/Listening (Papers 3–4)** — Phase 3 audio/speech, or out of scope?
7. **Mother-tongue scaffolding** — should vocabulary support optionally gloss in a chosen Mother Tongue, or English-only?

---

## 17. Appendix — worked examples (en-SG)

**A. `grammar_mcq` (subject–verb agreement):**
```json
{ "id":"itm_g12", "stem":"Neither the teacher nor the students ____ aware of the change.",
  "choices":[{"id":"a","label":"was"},{"id":"b","label":"were"},{"id":"c","label":"is"},{"id":"d","label":"are"}],
  "correctChoiceId":"b",
  "rationale":"In 'neither…nor…', the verb agrees with the nearer noun ('students', plural) → 'were'." }
```

**B. `grammar_cloze` (word bank):**
```json
{ "id":"itm_c04", "passage":"Wei Ming went ___ the hawker centre ___ he was hungry.",
  "wordBank":["to","because","although","at"],
  "blanks":[{"id":"1","acceptable":["to"]},{"id":"2","acceptable":["because"]}],
  "rationale":"'to' marks direction; 'because' gives the reason." }
```

**C. `comprehension_cloze` (no word bank):** passage with blanks; child types a word; scored against authored `acceptable[]` lists (author all genuinely valid alternatives, e.g. despite/although family).

**D. Session shape (10–20 min):** ~12–18 items = current-skill items at adaptive difficulty + ~15% interleaved review + (if triggered) one Lesson and guided practice; end on a win + progress summary.

---


---

## 18. Engineering Process (adapted from proven reference template) — LOCKED

**18.0 Owner working conventions (2026-07-20) — LOCKED.** (1) Keep replies **terse, technical, non-verbose** — conserve tokens. (2) **Give suggestions** where useful. (3) **Ask one relevant question at a time** (not batched) unless told to stop. (4) **Always merge to `main`** (feature-branch dev is fine, but every change lands on `main` = deploy). (5) **Always update this CLAUDE.md in the same change** (per §18.1).

**18.1 Living spec.** This CLAUDE.md is canonical. **Every code change updates it in the same change** — features, data model, file/module tables, roadmap checkboxes, ledger ticks, changelog. A code change with a stale CLAUDE.md is incomplete. All work merges to `main` (= deploy).

**18.2 Changelog table.** Every change appends a dated row: what · why · root cause (for fixes) · verification performed · CACHE_VERSION.

| Date | Change | Why | Verification | Cache |
|---|---|---|---|---|
| 2026-07-21 | **Owner sign-off — T17 ticked.** T17 sentence-manipulation (editing + synthesis MCQ-adapted forms, 20+20 items + lessons, already built/lint-clean/smoke-verified) approved and ticked. **Not signed off (nothing to approve — unauthored):** T18 (advanced decode ladder), T19 (decodable connected-text reading), and the T11 dictation remainder (blends→two-syllable) are not yet authored, so sign-off is premature — they need building first (then §12.5 review). **#6 EAL glossing** still blocked on Open Decision #7 (which mother tongue, or English-only). No code change. | Owner: "sign off everything" — only T17 was authored & pending | doc-only; `npm run build` green | v0.2.45 |
| 2026-07-21 | **Whole-system audit — immediate error correction (OG) + add-time difficulty flags.** Audit beyond the engine (interaction + content layers). **#1/#4 immediate voiced error-correction (all four item renderers, §8):** a WRONG answer is still scored (assessment unchanged) but no longer ends the item — the correct answer is **revealed + voiced** and the child must **reproduce it correctly** before continuing, so the LAST thing they produce is correct, not the error (core OG error-correction routine; prevents consolidating the wrong form — critical for dyslexia). `McqItem` (tap the highlighted+spoken correct choice), `TileItem`/`DictationItem` (the word is revealed as a copy-model and rebuilt from tiles; dictation fixes the first wrong word), `ClozeItem` (wrong blanks cleared, correct word shown greyed, re-placed). `onAnswer` is deferred until the fix is done, carrying the FIRST attempt — score and (correct-only) fluency latency are unaffected; placement warm-up (`quiet`) stays assessment-only (no correction). **#3 add-time difficulty flags (`AddStudent`/`types`/dashboard, §14):** optional decoding/fluency/vocab/comprehension/dyslexia flags captured at add-time, stored on `Child.difficultyFlags`, shown as chips on the teacher dashboard (closes the §14 TODO). **Deferred (content/owner-gated):** **#2 decodable connected-text reading** (word→text bridge) added as ledger **T19** — needs authored decodable-sentence reading packs + owner sign-off (§18.3); **#6 EAL mother-tongue glossing** remains Open Decision #7 (needs owner call). **#5 handwriting / #7 blend-tap segmentation** are platform-inherent (tiles/no-keyboard §13) — noted, not defects. | Whole-system OG audit (owner: "fix everything") | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS ×3 (adds MCQ correction on the struggle path + a tile wrong→model→rebuild drive in `#m3demo`); `npm run build` green | v0.2.45 |
| 2026-07-21 | **Progression-audit round 2 — retention-integrity fixes #1–#7.** Deeper OG audit of the retention machinery (the anchor of the dyslexia design). **#1 retention-failure now re-teaches (`Session.tsx`, §7):** a failed +2d review used to only re-book another review in 2 days; it now also fires an immediate **guided re-practice block** (3 difficulty-1 items on the forgotten skill) — real "demote to re-practice," not a deferred re-test. **#2 retention verifies BOTH channels (`Session.tsx`, §7):** acquisition schedules reviews for **decode AND encode** (was decode only); the certificate is withheld until **both** have retained (each review stage ≥1 = ≥2 review items across the pattern), so spelling retention — the more fragile channel in dyslexia — is actually checked, not assumed. **#3 placement holds back TWO encode rungs (`placement.ts`, §7):** a decode-only placement credited spelling for every rung below the top; it now holds back the top **two** rungs' encode (decode ≫ encode is the classic profile), so more spelling is earned in-session rather than assumed. **#4 massed practice first (`Session.tsx`, §7):** threading (sight words / letter-sounds) + interleave are suppressed until the child acquires their first pattern — a raw beginner gets an undiluted focus on the current skill (OG: massed for acquisition, distributed for retention); placement-credited children are already past this. **#5 down-shift (`Session.tsx`, §8):** when re-teaching is exhausted (2 lessons) and the child is still failing, drop to an easier **prerequisite** for supported practice instead of hammering the too-hard skill. **#6 fluency band excludes encode (`readiness.ts`):** reading-speed now measured over decode items only (SP-* excluded) so slow tile-building doesn't mislabel a child "effortful." **#7 encode-unlock needs evidence (`engine.ts`):** encode opens at ≥70% decode over **≥6 real items** (`ENCODE_UNLOCK_MIN`), not a 3/3 fluke; placement-confirmed decoders still unlock immediately. | Round-2 OG audit (owner: "fix everything") | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS ×3 (dual-channel confirmation flow re-verified, adds #7 unlock-threshold checks; placement/holdback paths re-verified); `npm run build` green | v0.2.44 |
| 2026-07-21 | **Progression-audit fixes #1–#5 (grapheme-level errors, fluency signal, safer placement, guided practice).** From a full Structured-Literacy/OG audit of the engine for the decode+spell dyslexia profile. **#1 grapheme-level error analysis (`scoring.ts` + `graphemeConcepts.json`, §7):** encode scorers (`scoreTiles`/`scoreDictation`) now name the concept from the EXPECTED grapheme at the first SUBSTITUTION (same-length mismatch) — `ship`→`chip` = `digraph-sh`, `cat`→`cot` = `vowel-short-a`, `bat`→`dat` = `consonant-b` (b/d reversal); omissions/insertions (length mismatch, e.g. a dropped silent-e) fall back to the item's authored tag. Delivers the "which grapheme missed → missedConcept" the spec promised, so struggle detection + the dashboard "stuck on" are now precise (and **#5** targeted confusable-pair remediation falls out of this — a repeated grapheme confusion now fires its own struggle→lesson). New `scripts/gen-grapheme-concepts.mjs` → `src/data/graphemeConcepts.json` (63 graphemes). **#2 fluency signal (`readiness.ts` + dashboard, §7):** median latency of recent CORRECT answers → a NON-gating teacher-only band (⚡ quick / 🕒 building / 🐢 effortful); "effortful but accurate" (≥85% + slow) is the classic dyslexia signature and drives a "practise for automaticity" action. No child-facing timer (respects §14). **#3 safer placement (`placement.ts`, §7):** `PER_SKILL` 2→3 — two lucky 3-choice guesses (1/9) could fluke a level and over-place a struggling reader; 3/3 drops that to ~1/27 and, capped at `MAX_ITEMS=15`, keeps placement conservative (start low). **#4 post-lesson guided practice (`Session.tsx`, §8):** after a lesson the runtime now forces a short block of **3 difficulty-1 items** on the just-taught skill (guided practice) before resuming normal rotation, so a child who just failed isn't dropped back into a harder item. **#6 deferred (content + owner sign-off):** extending the decode ladder past two-syllable (open/C-le syllables, morphology, prefixes/suffixes, schwa) is a content workstream that needs authored packs + owner review (§18.3) — added as ledger T18, NOT auto-shipped. | Full OG progression audit (owner: "fix everything") | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS ×3 (adds #1 substitution/omission scorer checks, #4 post-lesson difficulty-1 guard; placement paths re-verified at 3/level); `npm run build` green | v0.2.43 |
| 2026-07-21 | **Fix — Play/Trophies buttons spill past the child card (reported).** On a wider phone (≈430px → 3 narrow columns) the per-card **Play + 🏆 Trophies** buttons overflowed the card. Root cause: the action `.stack` inside the `.avatar` card was centred (avatar `align-items:center`) and shrink-to-fit to the widest button's content, so "🏆 Trophies" made the stack (and its buttons) wider than the narrow card. Fix (`styles.css`): action stacks now `align-self:stretch; width:100%` and `.avatar .btn.small { width:100% }` so buttons fill the card exactly (never exceed it), plus the picker grid min widened `120px→140px` (fewer, roomier columns on phones). Regression guard (smoke): a **new 430px two-child block** asserts every action button stays within its card's **content box** (derived from padding+border — a border-box/document-overflow check misses this spill because the button stays inside the padding cushion + viewport). Negative-tested: reverting the fix fails the guard (button 102px vs 83px content box); with the fix it passes. | Reported: buttons spilling out of the card | `npm run lint:packs` OK (34 packs); `npm test` PASS ×3 (adds the content-box spill guard, negative-tested); `npm run build` green | v0.2.42 |
| 2026-07-21 | **Letter-sounds (T01) unblocked + scaffolded — no longer a wall.** Reported: a struggling reader was "stuck at the same two words, man and ant" — i.e. walled at the audio-only `PH-letter-sounds` floor whose lesson had just 2 fixed examples, unable to reach CVC. Two fixes (owner: "both"). **(1) Threaded, not gating:** `PH-letter-sounds` is now `threaded:true` (like HF sight words) and **removed as CVC's prereq** (CVC is the ladder floor). A shaky child now starts on real CVC word-reading (which has visual choices) while letter-sounds is woven in every ~8th item (two threaded skills — letter-sounds + HF — rotate every 4th), instead of being blocked behind isolated-phoneme discrimination. **(2) Scaffolded + varied:** each letter-sounds choice now shows a **keyword anchor** under the letter (`Choice.keyword`, e.g. `a`/"ant" — OG sound→keyword→letter, generator-sourced, rendered by `McqItem`); the lesson gained **6 keyword examples** (was 2) and `LessonView` now shows a **rotating random subset (≤3)** so it stops repeating the same two words. `gen-letter-sounds.mjs` regenerated (46 items, keyworded choices, 6-example lesson); new CSS for the anchor. Smoke: T01/threaded invariants rewritten (letter-sounds threaded + not eligible + not a CVC prereq; CVC is the floor; two threaded skills rotate, 4 fires/16 with both appearing), and the decode-choice tile click switched to **index-based** (keyword sublabels break exact-text matching). | Reported: struggling reader stuck at letter-sounds ("man and ant") | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS ×3; `npm run build` green | v0.2.41 |
| 2026-07-21 | **Child-facing trophies (two surfaces) + wider voice-speed range.** Reported: students had no way to see achievements (badges/certs were teacher-dashboard-only), and voice speed "doesn't work" on iPhone. **Trophies (§14):** new child-facing `src/features/Trophies.tsx` — celebratory, growth-only (level + XP progress bar via `gamify.toNextLevel`, the 6 achievement badges earned/locked, and earned certificates' "I can…" statements; no readiness/AL band — that stays parent-only). Reachable **two ways**: (a) a **"🏆 Trophies"** button per child on `ChildPicker` (+ `onTrophies` prop, `App` `trophies` view), and (b) the **session summary now highlights awards earned THIS session** — `Session` snapshots earned-badge ids at mount + collects certs minted during the run, and the summary shows a "New this session!" block (new certs + newly-earned badges) plus a "🏆 My trophies" button into the trophy room. **Voice speed (§14, #1 follow-up):** the range/step was too narrow to perceive; widened 0.5–1.3×/0.1 → **0.4–1.6×/0.2**, with a note that iOS built-in voices only partly honour `rate` (a Web-Speech platform limit, not a wiring bug — real speed control needs pre-recorded audio, Phase 2). New CSS for the trophy room + award highlights. Smoke: session-entry selector fixed to `/Play with Test/` (the new Trophies button also matched `/Test/`), + asserts the summary highlight after the confirmation cert and drives the trophy room (badges + certificate sections, no overflow). | Reported: students can't see achievements; voice speed ineffective on iPhone | `npm test` PASS ×3 (adds summary-highlight + trophy-room checks); `npm run build` green (precache 59) | v0.2.40 |
| 2026-07-21 | **OG-audit pedagogy fixes #1–#4 (mastery = retention; overlearning; spelling not free-placed; earlier + repeatable re-teach).** From a Structured-Literacy/OG review of the engine for the dyslexia profile. **#1 retention gate (`Session.tsx`, §7):** the certificate is now WITHHELD at acquisition and minted only on the **first +2d spaced-review pass** — mastery = retention, not same-session accuracy. Acquisition still advances the ladder (PROVISIONAL mastery, keeps momentum) + schedules the +2d review; the review-pass branch awards the cert once (guarded by a loaded `certsRef`). **#2 overlearning:** every P1 phonics/spelling `minItems` **8→12** (fixes the spec/excerpt inconsistency; 85%×12 ≈ 11/12 — real overlearning for struggling readers). **#3 spelling not free-placed (`placement.ts`/`engine.ts`, §7):** the reading placement only tests decoding, so `priorSkillIds` no longer auto-credits the **top** rung's encode partner — the child must EARN that spelling in-session before the decode entry unlocks (`encodeUnlocked` made placement-aware so the held-back encode is immediately eligible). Spelling lags decoding in dyslexia; a high placement no longer hands it out for free. **#4 earlier + repeatable re-teach (`engine.ts`/`Session.tsx`, §8):** struggle trigger `<0.6 over ≥5` items or **2** same-concept misses (was `<0.5/≥6` and 3 — too late); the lesson may now re-fire **once more** (cap 2/skill/session) after ≥3 further failed attempts if still struggling. **Root-cause fix (surfaced by the new due-review test):** `Session` mount effect was **unguarded against StrictMode double-invoke** (raced two `advance()`s, dropping the due review) — added a `startedRef` guard (as `Placement` already had). **Deferred (agreed):** #5 fluency/automaticity gating (conflicts with §14 no-timing-pressure default) and #6 morphology/affix/other-syllable-type decode scope (content roadmap, not an engine fix). | OG audit: mastery must mean retention + overlearning; spelling over-placed; late one-shot intervention (owner: "do all") | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS ×3 (adds #1 confirmation-review flow driving cert on a backdated +2d review, #2 minItems-12 gate, #3 held-back-encode-served-first + placement-aware `encodeUnlocked`, #4 earlier-struggle + StrictMode guard); `npm run build` green | v0.2.39 |
| 2026-07-21 | **Phoneme clips re-recorded (all 44) + version footer de-drifted.** Owner replaced every `public/phonemes/*.m4a` with new, longer recordings (each ~2–5× the byte size; filenames unchanged so `phonemes.json` + `audio.phoneme()` resolve identically). Uploaded direct-to-`main` via GitHub web (deploy `e0d6f6b` green); workbox content-hashes the clips so the SW surfaces the update toast and re-fetches only the changed files — no manifest edit needed. Separately fixed the stale visible version: `App.APP_VERSION` was hand-set to `0.2.29` (drifted 8 releases behind `package.json`); now injected from `package.json` via a vite `define` (`__APP_VERSION__`, declared in `vite-env.d.ts`), so §13's footer can never drift again. | Owner re-recorded the phoneme set; footer had drifted (§13/§18.6) | `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS; `npm run build` green (footer renders 0.2.38) | v0.2.38 |
| 2026-07-21 | **Voice — Samantha only.** `listVoices()` now filters to voices named Samantha (was all English), so the Settings picker offers just Samantha; `speak()` default preference is chosen-voice → Samantha → first en-GB → platform default (so the app uses Samantha even before any pick). Picker's ◀▶ arrows hidden when ≤1 voice. On non-Apple devices with no Samantha the row hides and TTS falls back to en-GB. | Owner: "just stick to Samantha and remove the rest" | `npm test` PASS; `npm run build` green | v0.2.37 |
| 2026-07-21 | **Rename user-facing "Parent" → "Teacher".** Visible strings only: ChildPicker "🔒 Teacher area" (+aria-label), dashboard header `Teacher area`, PIN titles "Enter/Create a teacher PIN". Code identifiers (`ParentDashboard`, `onParent`, file) kept to avoid churn — behaviour identical. Smoke assertions updated to the new copy. | Owner: "rename from parent to teacher" | `npm test` PASS; `npm run build` green | v0.2.36 |
| 2026-07-21 | **Diagnosis — TTS silent = iOS ring/silent switch (not a code bug).** Owner's Test reported `▶ speaking…` (engine starts) but no sound. Root cause: on iOS `speechSynthesis` output follows the **ringer/silent hardware switch + ring volume**, while HTML5 `<audio>` (the phoneme `.m4a` clips) plays on the media channel and ignores it — so clips are audible but TTS is muted when silent mode is on. Not fixable in-app (Web Speech gives no channel control). Added an inline hint under the Voice row (shown once Test reports speaking/finished) telling the parent to switch silent mode off + raise the ringer volume. | Owner: "says speaking but no sound" | `npm test` PASS; `npm run build` green | v0.2.35 |
| 2026-07-21 | **TTS Test button — self-diagnosing (still-silent report).** Prior cancel-guard fix didn't resolve it on the owner's device, so the Test button now builds its own utterance with `onstart`/`onend`/`onerror` handlers and shows the engine's own status inline (`▶ speaking…` / `✓ finished` / `✗ not-allowed|interrupted|synthesis-failed` / `no speechSynthesis` / `sent (N voices)…`). This distinguishes a device-mute/volume problem (fires `✓ finished` but no sound) from a permission/gesture problem (`✗ not-allowed`) from speak() never running — so the next report pinpoints the cause instead of guessing. | Reported: Test still doesn't work — need the device's own error | `npm test` PASS; `npm run build` green | v0.2.34 |
| 2026-07-21 | **Fix — TTS Test button silent (iOS).** Root cause: `speak()` called `synth.cancel()` unconditionally; iOS Safari drops a `speak()` that immediately follows `cancel()` when nothing is queued — the dashboard Test was the first TTS call, so its utterance was swallowed. Now cancels only to interrupt an in-flight utterance (`synth.speaking || synth.pending`) and `resume()`s if paused. | Reported: Test button doesn't work | `npm test` PASS; `npm run build` green | v0.2.33 |
| 2026-07-21 | **TTS voice picker in parent Settings.** `speak()` previously hard-picked the first en-GB voice; now `audio.ts` gains `setVoice(voiceURI)` / `listVoices()` (English voices only) / `onVoicesReady(cb)` (handles the async `voiceschanged`), and `speak()` prefers the chosen voice (falling back to first en-GB, then platform default). New `Settings.voiceURI?` persisted; applied app-wide on boot (`App`) and per session (`Session`). Dashboard Settings adds a **◀ name ▶ stepper + 🔊 Test** row (non-native, §18.12; hidden when the device exposes no voices). | Owner: "can change the TTS?" → chose a Settings voice picker | `npm test` PASS (existing settings walk green; voice row is hidden in headless — no installed voices — so verified manually that selection persists + Test speaks); `npm run build` green | v0.2.32 |
| 2026-07-21 | **T01 letter-sounds ACTIVATED — 44 phoneme clips shipped (owner-recorded).** Owner dropped all 44 `public/phonemes/*.m4a` clips (23 single-letter for T01 + 21 digraph/vowel-team for later levels); validated every manifest id resolves to a non-empty file, no extras. Flipped `PH-letter-sounds` live: removed `enabled:false` in `scopeAndSequence.json`, so it re-enters the runtime graph as the **decode floor** (prereqs `[]`) and CVC's `["PH-letter-sounds"]` prereq now resolves instead of being stripped. Placement ladder **unchanged** (letter-sounds has no `encodePairId`, so it isn't a dual-gated rung) — but a low placement now serves letter-sounds first in-session (foundation before CVC), and `placement.priorSkillIds` already marks it mastered for higher placements. `audio.phoneme()` resolves `import.meta.env.BASE_URL + 'phonemes/' + file` → correct on Pages; clips SW-precached (precache **15→59 entries**). Smoke's T01 guard flipped inert→active (skill present, floor with no prereqs, CVC depends on it). **T01 ticked.** | Owner: "ok done... all 44" — phoneme recordings delivered | manifest check: 44/44 resolve, none empty, no extras; `npm run lint:packs` OK (34 packs, 1611 items, 0 warnings); `npm test` PASS; `npm run build` green (59 precache entries) | v0.2.31 |
| 2026-07-21 | **Owner sign-off — 6 breadth packs approved.** T14 tenses, T15 antonyms+context, T16 inference+vocab-cloze, T11 digraph-dictation all owner-approved; ledger notes updated (approved). No code change. | Owner: "Sign off." | doc-only; `npm run build` green | v0.2.30 |
| 2026-07-21 | **Content breadth — 6 new packs (T11/T14/T15/T16 follow-ups).** All buildable ledger breadth authored in one pass, each 20–24 items + lesson, en-SG, lint-clean, gated behind existing chains so the mature session/placement flow is unperturbed. **T14** `grammar-L03-tenses` (`GR-tenses-basic`, prereq `GR-sva-simple`; 24 grammar_mcq — past/present/continuous/future incl. irregular went/sang/won/lost). **T15** `vocab-L02-antonyms` (`VOC-antonyms`, prereq `VOC-synonyms`; 24) + `vocab-L03-context` (`VOC-context`, prereq `VOC-antonyms`; 24 context-clue). **T16** `comp-L02` (`CM-inference`, prereq `CM-comprehension`; 20 passage_question, inference/evaluative, longer passages) + `cloze-L02-vocab` (`CL-vocab-cloze`, prereq `CL-grammar-cloze`; 20 grammar_cloze, content-word word-bank). **T11** `dictation-L03-digraphs` (`SP-digraph-dictation`, prereq `SP-cvc-dictation`; 20 sh/ch/th/ck sentence-dictation, decodable within the SP-digraphs envelope, single-tile digraphs). No new item types/renderers — all reuse `McqItem`/`ClozeItem`/`DictationItem`. Scope gains 6 skills (1 in P1 dictation chain, 5 in P3 parallel branches); no smoke changes needed (existing M3 gating + T12/T17 invariants still hold — new skills all gated behind two-syllable). **Owner-approved 2026-07-21.** | Owner: "Do all now" — author every buildable content-breadth item (audio-blocked T01 + free-text §2/§6 excepted) | `npm run lint:packs` OK (**34 packs, 1611 items, 0 warnings**); `npm test` PASS; `npm run build` green | v0.2.30 |
| 2026-07-20 | **T17 sentence manipulation — MCQ-adapted (editing + synthesis & transformation).** New strand `sentence` + item types `editing_mcq`/`synthesis_mcq` (both render via `McqItem`, deterministic exact-match, **no keyboard** §13). Scope P3: `SM-editing` (prereq `CL-grammar-cloze`) → `SM-synthesis` (prereq `SM-editing`), gated deep behind the grammar/cloze chain. Packs `sm-L01-editing` (20 spot-and-correct: SVA, tense, plural, article, pronoun, possessive, capitalisation, spelling) + `sm-L02-synthesis` (20 pick-the-rewrite: because/although/so/but, both/neither-nor/either-or, who/which relative clauses, when/if/unless/while, reported speech, too…to, so…that, despite, not only…but also) + lessons, en-SG. Lint: added both types to `mcqTypes` (key + unique-label validation). Wired into the DEV `#m3demo` harness; smoke drives an editing item and asserts SM is gated (not eligible up front). **What stays deferred:** typed/free-text synthesis (needs keyboard/AI scorer, ruled out §2/§6). | Make Sentence Manipulation playable deterministically, MCQ-adapted like open-ended comprehension | `npm run lint:packs` OK (28 packs, **1479 items, 0 warnings**); `npm test` PASS (adds editing drive + T17 gating invariant); `npm run build` green | v0.2.29 |
| 2026-07-20 | **T12 HF threading** (closes the last open piece of T12). `HF-words` becomes a `threaded` skill (new `SkillDef.threaded` flag; prereq removed): `engine.eligibleSkills` filters threaded skills out of the normal rotation, and `engine.threadedSkill(count)` returns the HF skill **every 4th session item** (`THREAD_EVERY=4`, ~19–25% of a session), rotating if several threaded skills exist. `Session.advance` serves the threaded item right after due-reviews and before the interleave/eligible branches. Effect: tricky sight words (the/was/said…) are woven through **every** session from the very first level, not gated after two-syllable. Smoke adds a T12 engine invariant (HF absent from eligible; threads on the 4th-item cadence, 4× per 16). | Thread HF sight words throughout as §5/§6d intends, instead of end-gating them | `npm test` PASS (T12 cadence + eligible-exclusion invariants, plus all prior flows); `npm run lint:packs` OK (26 packs, 1439 items, 0 warnings); `npm run build` green | v0.2.28 |
| 2026-07-20 | **T11 dictation built** (new `dictation` item type end-to-end). Added `dictation` to `ItemType` + a `words[]` field to `PackItem`; `scoreDictation` (per-word tile match); `DictationItem` renderer (hear a short decodable sentence → build it one word at a time from grapheme tiles, "Next word"/"Check"); `dictation-L02-cvc` pack (20 CVC-only sentences using a/it/is/in/on/up as decodable function words — no HF like "the"; each word canonical-segmented, decodable within the CVC envelope) + lesson; scope skill `SP-cvc-dictation` (strand spelling, single-gate, **prereq SP-two-syllable** so it's gated after the ladder and never perturbs placement/early-session timing). Lint gained a dictation branch (per-word graphemes present + canonical + decodable; skips the whole-sentence audioText from the word-level decodability check). Wired into Session render + the DEV `#m3demo` harness; smoke drives the renderer word-by-word and asserts `scoreDictation` math. Remaining TXX status: **T01 blocked on owner phoneme recordings; T12 HF threading is engine follow-up; T17 deferred (free-text).** | Continue the ledger — dictation is the one buildable capstone (T01 audio-blocked, T17 deferred) | `npm run lint:packs` OK (26 packs, **1439 items, 0 warnings**); `npm test` PASS (adds dictation renderer drive + scorer math; M3 strands + all prior invariants green); `npm run build` green | v0.2.27 |
| 2026-07-20 | **T14/T15/T16 owner-approved → ticked** (grammar articles+SVA, vocab synonyms, comprehension+grammar-cloze; 24 items each, lint-clean). Ledger notes list future adds (tenses-basic, antonyms/context-clue, more passages) as follow-ups, not blockers. | Owner sign-off on the expanded M3 Paper-2 starter track | doc-only; `npm run build` green | v0.2.26 |
| 2026-07-20 | **M3 starter packs expanded 10→24 items each** (clears the 5 §6d sub-floor warnings): `grammar-L01-articles` (a/an/the incl. silent-h & 'one'/'university' sound rules), `grammar-L02-sva` (singular/plural, collective, neither-nor, 'each'/'every', Maths-as-singular), `vocab-L01-synonyms` (14 more sentence-synonym items, correct-choice position varied a/b/c), `comp-L01` (14 more en-SG passages, literal + inference), `cloze-L01-grammar` (14 more word-bank items, connector/preposition). All en-SG, Singapore context, unique choice labels; T14/T15/T16 ledger notes updated (still pending owner sign-off). | Clear the 5 sub-floor lint warnings + make Paper-2 substantive | `npm run lint:packs` OK (25 packs, **1419 items, 0 warnings**); `npm test` PASS; `npm run build` green | v0.2.25 |
| 2026-07-21 | **Warm-up UX — remove progress bar + gentle end card (reported).** The 15-dot progress bar made a ~6-item warm-up look like it had quit early (6/15 filled), and finishing snapped straight back to the picker (felt abrupt). Removed the dots entirely; `Placement` now ends on a friendly card ("Nice warm-up, {name}! 🌟 … Let's read") that the child taps to continue, instead of auto-jumping. Smoke's three placement drives updated to click through the new done card (via a DOM click — the button is confirmed actionable in isolation; the harness DOM-click avoids a suite-only actionability-stability flake). | Reported: progress bar implies premature exit; abrupt ending | `npm test` PASS ×3; `npm run build` green | v0.2.24 |
| 2026-07-21 | **Fix — warm-up placement ended after 2 items (reported).** A new account's warm-up stopped after two taps whenever the child missed either of the first two items: the staircase requires 2/2 correct to climb, and CVC is the enabled floor, so a partial miss decided the entry immediately and finished. Made worse by the task being audio-only ("Tap the word you hear", cat/cot/cut) — on iOS TTS is often silent until the child taps 🔊, so the first pair is easily missed. Fix (`placement.ts` + `Placement.tsx`, §7 "warm-up game… end on an achievable item"): once the entry level is decided, top up with **achievable** items (difficulty-1 from a level already cleared, or the floor) to a **`MIN_WARMUP=6`** minimum, ending gently; padding items are *not* scored so they don't move the placement. Also **guarded the mount effect against React StrictMode double-invoke** (was advancing twice, discarding the first item and skewing the count). Warm-up copy now nudges tapping 🔊. Smoke counts placement items and asserts **≥6** on the struggle path (was ending at 2). | Reported: intro warm-up ends after two steps | `npm test` PASS ×3 (adds ≥6-item warm-up guard); `npm run build` green | v0.2.23 |
| 2026-07-20 | **§18.11 content & pedagogy audit (pre-"done" gate).** Re-verified every shipped pack + the engine against spec; **no content defects found**. Two new automated guards added to `lint-packs` (both negative-tested — confirmed they fail on a planted violation, then reverted): **(8) canonical grapheme segmentation** — every encode item's `graphemes` must equal the greedy longest-match chunking of its `displayWord` within its envelope, so digraphs/vowel-teams/medial-doubles stay single OG tiles (`ship`→`sh·i·p`, not `s·h·i·p`); **(9) distractor uniqueness** — MCQ choice labels must be distinct (no accidental second-correct). All 25 packs pass both. Manual scans clean: no US spellings beyond the blacklist (`-ize`/`-or`/color/center…), no Singlish target answers, no empty `stem`/`rationale`/`iCanStatement`/`explanation`. Engine invariants (dual gate A2, placement-mastery A1, difficulty A3, interleave A5, SRS +2/+7/+21d, struggle→lesson-once, cert idempotency) already guarded by the committed smoke — re-confirmed green ×3. **Reviewed acceptance (not a defect):** M3 comprehension/vocab/cloze passages are not decodability-linted by design — they're gated behind the *full* decode ladder, are meaning-focused MCQ, and §3 permits EAL vocabulary glossing. | §18.11 "before done" audit — verify the shipped base before the family relies on it | `npm run lint:packs` OK (25 packs, 1349 items) with 2 new gates; negative-tests confirmed both bite; `npm test` PASS ×3; `npm run build` green | v0.2.22 (build-gate only — no client bundle change) |
| 2026-07-20 | **Fix — button overflow with OpenDyslexic (reported).** The wider OpenDyslexic glyphs pushed two layouts off-screen: the Manage **Reset/Remove** buttons inside the narrow 2-column avatar cards, and the **Settings** font/stepper rows. Root cause: `.btn.small` had fixed wide padding (`0 24px`) and `flex:0` (no shrink), and the rows didn't wrap. Fixes: `.btn.small` → `flex:0 1 auto; min-width:0; padding:0 14px`; ChildPicker manage actions + confirm now **stack vertically** (full-width, fits any font); `.set-row` and its control group `flex-wrap:wrap`. Rejected a `.app{overflow-x:hidden}` band-aid — it would have *clipped* the buttons and silently defeated the overflow test. Smoke now forces `data-font=dyslexic` and asserts no horizontal overflow on the **Manage** (row + confirm) and **Settings** screens (the exact spots reported). | Reported: buttons spill off-screen in OpenDyslexic | `npm test` PASS ×3 (adds dyslexic-font overflow guards on manage + settings); `npm run build` green | v0.2.22 |
| 2026-07-20 | **M4 completion — achievements + a11y focus.** `gamify.achievements(attempts,certs,usage)` (pure): six growth-only badges (getting-started, first-cert, 50/100 correct, five-skills, 3-week-streak), shown per child on the dashboard as earned/locked with a "N/6 badges" count. A11y: the `.screen` `<main>` is focusable (`tabIndex=-1`) and takes focus on every view change so screen readers announce the new screen (§18.12); labelled settings steppers already landed in v0.2.20. Smoke adds `achievements` invariants (none earned at zero; getting-started+first-cert after 1 correct/1 cert) and a dashboard badge-row check. **M4 core complete.** *Left as genuinely-deferred:* threshold tuning (needs the family's real usage data, §15) and `ui.ts` shared modal/toast primitives (no functional gap — all dialogs are already non-native per §18.12). | Finish M4's gamification depth + a11y pass; the remainder needs live data or is non-functional | `npm test` PASS ×3 (adds achievement guards + badge row); `npm run build` green | v0.2.21 |
| 2026-07-20 | **M4 — polish (dyslexia font, settings, gamification, a11y/cache).** **Fonts now self-hosted + offline** (§14): `@fontsource/lexend` + `@fontsource/opendyslexic` (400/700) imported in `main.tsx` → woff2 bundled + SW-precached (previously the CSS named "Lexend" but shipped nothing, so offline users fell back to a system font). Default **Lexend**; **OpenDyslexic opt-in** via `data-font` on the root, applied on boot from `settings.font` and toggled live. **Settings** surfaced in the parent dashboard (PIN-gated): font choice, voice speed (ttsRate 0.5–1.3×), session length (8–24) — persisted to the `settings` store; `Session` now reads `sessionLength`/`ttsRate` (via `audio.setRate`) on mount instead of a hard-coded 16. **Gamification** `src/lib/gamify.ts` (pure, derived — no stored score to drift): XP = 10/correct + 50/certificate, quadratic `level()`; the child picker shows a "⭐ Lvl N" badge and the session summary shows "+N XP". **Cache pre-warm** (§13): `pwa.ts` runs `registration.update()` on `visibilitychange` (foreground) — never auto-reloads; the waiting-SW toast still governs. Smoke adds: boot sets `data-font=lexend`, dashboard toggle → `dyslexic` persists across reload, picker level badge renders, and `gamify.xp`/`level` invariants. | M4 milestone — the dyslexia-first font was referenced but never bundled (offline gap); plus learner motivation + adjustable pacing (§14) | `npm test` PASS ×3 (adds font toggle/persist, XP badge, gamify guards); `npm run build` green; precache 15 entries incl. woff2 | v0.2.20 |
| 2026-07-20 | **M3 — PSLE Paper-2 foundations (grammar/vocab/comprehension/cloze; MCQ + word-bank).** New scope level **P3** with 5 skills gated behind the full decode ladder (`PH-two-syllable` pattern, §5 — unreachable until decoding clears) + intra-strand chains: `GR-articles`→`GR-sva-simple`, `VOC-synonyms`, `CM-comprehension` (prereq VOC), `CL-grammar-cloze` (prereq SVA). Types: added item types `vocab_mcq`/`vocab_cloze_mcq`/`passage_question`/`visual_text`/`grammar_cloze`, strands `comprehension`/`cloze`, and `PackItem.passage`/`wordBank`/`blanks`. Renderers: `McqItem` now shows an optional `passage` (reused for every MCQ type — grammar/vocab/comprehension/visual-text); **new `ClozeItem`** (tap a word-bank word → fills the next blank, tap a blank to clear, Check; each word used once; no keyboard §13). Scoring: `scoreCloze` (per-blank acceptable-list, deterministic). Packs (10 items each + lesson, en-SG): `grammar-L01-articles`, `grammar-L02-sva`, `vocab-L01-synonyms`, `comp-L01`, `cloze-L01-grammar`. §6b lint extended: new MCQ types validated; `grammar_cloze` checked (word bank ≥2, blanks present, every acceptable ∈ bank). Session serves the cloze renderer. **Deferred (§2/§6):** editing, comprehension-cloze (no word bank), synthesis & transformation — free-text/brittle, no keyboard. DEV-only `#m3demo` route + `M3Demo.tsx` render the cloze + a passage MCQ so the smoke exercises the renderers without mastering the whole ladder; smoke adds M3 gating (grammar gated → unlocks after two-syllable pattern), `scoreCloze`/`scoreMcq` invariants, and the demo render (correct answers score, no overflow/errors). | M3 milestone — the PSLE Paper-2 strands, validly sequenced behind decoding | `npm run lint:packs` OK (25 packs, 1349 items, 5 pool<20 warnings); `npm test` PASS ×3; `npm run build` green | v0.2.19 |
| 2026-07-20 | **M2 — parent dashboard + readiness + analytics + backup.** Data layer: store **DB v4** adds `aggregates` (per child·ISO-week·skill `{items,correct,minutes}`, never rolled off), `usage` (weekly session count + streak, target 4), `settings` (PIN, ttsRate, variant, sessionLength); oldVersion-guarded migration. `src/lib/aggregate.ts` (ISO-week key + consecutive-week test), `src/lib/readiness.ts` (pure §10 status On-Target/Some-Risk/High-Risk + coarse AL band framed as *early estimate* + growth stats + action plan from recent stuck-on `missedConcept` tags), `store.exportAll()/importAll()` full-DB JSON backup (§11 safety net). Session now counts the session in `usage` on mount (streak rolls on new ISO week) and writes a weekly aggregate per answer; progress status uses placement-aware `isMastered` (already) so interleaved reviews don't corrupt rollups. UI: `ParentDashboard.tsx` (PIN-gated via on-screen `PinPad.tsx`, §18.12 no native dialogs) — per-child growth card (skills mastered, recent accuracy, weeks active), reading-level vs P-level, traffic-light status, "N of M sessions + streak", weekly bar chart from aggregates, action plan + stuck-on chips, recent certificates, per-child reset, and global **Export/Import backup**; band shown small + parent-only. `ChildPicker` gains a "🔒 Parent area" entry; `App` adds the `dashboard` route. Smoke adds: aggregates+usage written by a session, readiness invariants (empty→On-Target, 6-wrong→High-Risk), non-destructive export/import round-trip (row-count stable), and a dashboard UI walk (add child → create PIN → growth card renders → export downloads) — zero console errors, no overflow at 390px. | M2 milestone — parent visibility + the export/import backup §13 flags as the eviction safety net | `npm test` PASS ×3 (adds M2 dashboard + readiness + export/import guards); `npm run build` green; DB v4 migration additive | v0.2.18 |
| 2026-07-20 | **T01 — letter-sounds scaffolding (inert until phoneme clips ship).** Foundational single-letter→sound level below CVC, wired end-to-end but **disabled** pending the recorded audio. Added: `src/data/phonemes.json` (44-clip manifest, id→`public/phonemes/*.m4a`); real `audio.phoneme()` (cached `HTMLAudioElement`, silent no-op when a clip is absent — no console error); `PackItem.phonemeId` + `McqItem` branch (decode_choice prompt plays a phoneme clip, "🔊 Hear the sound", instead of TTS); `scripts/gen-letter-sounds.mjs` → `phonics-L01-letter-sounds.json` (**46 items** = 23 single-letter sounds ×2, distractors curated to never share the played sound — the /k/ item never offers 'c'; + lesson); `PH-letter-sounds` envelope in `decodability.json`; SW precache glob gains `m4a`. **Inert mechanism:** scope skill carries `enabled:false`; `packs.SKILLS` drops disabled skills **and strips prereqs that point at them**, so CVC's new `["PH-letter-sounds"]` prereq collapses to `[]` and live behaviour is unchanged. `placement.priorSkillIds` now also marks non-ladder foundation prereqs mastered (turnkey so a high placement won't leave letter-sounds blocking once enabled). **To activate:** drop the 23 `public/phonemes/*.m4a` clips + set `enabled:true` + re-verify + owner sign-off. Smoke guards T01 stays inert (skill absent, CVC prereq stripped); temporarily flipping `enabled:true` confirmed lint+build clean and the graph valid, then reverted. | T01 was blocked only on audio assets; scaffold everything else so clips are the last step | `npm run lint:packs` OK (20 packs, 1299 items, 0 warnings); `npm test` PASS (adds T01-inert guard); `npm run build` green; enable-flip dry-run clean | v0.2.17 |
| 2026-07-20 | **T13 — lesson coverage hard-gated (§8).** All 19 runtime skills (9 decode + 9 encode + HF) already shipped explicit en-SG lessons (rule + worked examples), but the build only *warned* on gaps and never checked shape — a future pack could ship a lesson-less skill and silently break the struggle→lesson branch (`getLesson` → undefined → no re-teach). §6b lint gains check (7): every scope skill must have a lesson in its pool pack with a non-empty `iCanStatement` + `explanation` (≥10 chars) + ≥1 worked example (each `text`+`note`), all en-SG-scanned — hard build error otherwise. Negative-test (emptied a `workedExamples`) confirmed the gate fails red; reverted. Closes T13. | Struggle→lesson silently no-ops for any lesson-less skill — make coverage guaranteed, not incidental | `npm run lint:packs` OK (19 packs, 1253 items, 0 warnings); negative-lint caught the empty lesson; `npm test` PASS; `npm run build` green | v0.2.16 (build-gate only — no client bundle change) |
| 2026-07-20 | **A5 — cumulative interleave (§7, §17D) + related fixes.** New `engine.interleavedReviewSkill(attempts,count,pre?)`: every 5th session item (~18% of 16) returns a mastered skill to slip in as a quick review, rotating through the mastered set; `Session.advance` serves it as a **normal attempt** (not an SRS review — no demotion). Because an interleaved review of a *placement*-mastered skill has few/no attempts, `Session` now writes progress status via placement-aware `isMastered(...,masteredRef)` so such a review never downgrades a 'mastered' row to 'active' (A1 persistence). Since interleave lowers per-pattern throughput, a full dual pattern can span >1 session — the smoke's mastery path now **re-enters sessions until a certificate lands** (≤6), and its grapheme-tile clicks target an **enabled** tile (repeated-grapheme words like p·o·p reuse a label; `.first()` alone re-hit the disabled first tile). Engine invariants extended with A5 cadence/selection guards. Closes the last open §18.11 item. | §17D interleaving was unimplemented — only time-due SRS reviews existed | `npm test` PASS ×3 (adds A5 guards + multi-session mastery path); `npm run build` green | v0.2.16 |
| 2026-07-20 | **Engine audit fixes (§18.11 A1–A4).** Root cause: `Session` derived mastery from **attempts only** — placement wrote `progress.status='mastered'` + `entrySkillId` the session never read, so a placed child restarted at CVC (**A1**); and eligibility/advancement/certificate used single-skill `skillMastered`, leaving `patternMastered` dead code — decode-only mastery advanced the ladder and earned a certificate **without spelling** (**A2**, breaks the core dual gate). Fixes: `engine.isMastered(attempts,skill,pre?)` folds in placement-mastered skills; `eligibleSkills`+`patternDecodeSkill` moved into `engine.ts` (single source, §18.7) and now gate decode advancement on the **prior pattern** (decode AND encode) and award **one pattern certificate** on dual-gate completion; `Session` seeds `masteredRef` from `progress`. **A3** `nextDifficulty` counts the trailing streak (resets after each promotion → 1→2→3 over 6 corrects, not 4). **A4** corrected a misleading `scoreTiles` comment. Harness: `window.__engine`/`__getSkill` exposed (DEV); smoke gains engine invariants (A2 dual-gate + advancement, A1 placement-mastery, A3 streak) + an e2e A1 check (session skips placement-mastered CVC). Deferred **A5** (§17D 15–20% mastered-skill interleave — only time-due SRS reviews exist today). | §18.11 audit — engine sequencing deviated from §7 while the data layer was clean | `npm test` PASS incl. new A1/A2/A3 guards (negative-test confirmed the A2 guard red on the old gate); `npm run build` green | v0.2.15 |
| 2026-07-20 | Spec instantiated | Project start | — | — |
| 2026-07-20 | M0 scaffold: Vite+React+TS+PWA, Actions→Pages, IndexedDB store, add-student, ChildPicker, one grammar_mcq loop, update-toast, dyslexia-first styles | First Session Playable milestone start | Offline env — build verified via Actions on push | v0.1.0 |
| 2026-07-20 | M1 first increment: adaptive engine (`engine.ts` — rolling-window mastery, difficulty 1–3, dual decode+encode gate, encode-unlock @70%, struggle→lesson), scope&sequence loader (`packs.ts`, `scopeAndSequence.json`), tile encode renderer (`build_word`) + `decode_choice` MCQ renderer, `scoring.scoreTiles` grapheme-sequence match, `audio.ts` TTS `speak()` (en-GB) + stubbed `phoneme()`, real Session runner (interleaved skills, SESSION_LEN=16, certificates), store schema v2 (attempts keyed by uuid + childId index, progress/certificates stores). CVC short-vowel decode+spelling packs (12 items each) + lessons. Committed `npm test` Playwright harness. Root-cause: tsconfig.node `noEmit` broke `tsc -b` (TS6310) → emitDeclarationOnly+outDir. | M1 MVP core (decoding+spelling engine) start; reaches First Lesson Playable 🏁 (§18.10) | `npm test` PASS headless @390px: mastery→2 certs, dual-gate lockout (encode stays locked when decode <70%), struggle→lesson fires once, zero console errors, no horizontal overflow; `npm run build` green | v0.2.0 |
| 2026-07-20 | §6b build-lint (`scripts/lint-packs.mjs` + `src/data/decodability.json`): validates answer-key resolution, one-correct-per-item, en-SG (US-spelling blacklist), §6a decodability (greedy grapheme segmentation per envelope), duplicate item ids, pool floor (=mastery.minItems, warn <20); wired into `build` as a hard gate + `lint:packs` script. Removed orphaned M0 `grammar-L01-articles` pack (skill not in runtime scope; grammar is M3/T14) — lint caught the dangling skill ref. **App bug fixed** (lint/harness surfaced it): when `pickItem` recycled the pool and re-served the same item id, the item renderer kept its `key={item.id}` so React reused the mounted `McqItem`/`TileItem` with stale internal `picked`/`built` state → item appeared pre-answered with no Continue (a child would soft-lock too). Fix: key renderer by a per-serve counter (`serve`) so every serve remounts fresh. Hardened smoke harness (spawn Vite JS entry + reliable kill; DOM-gated "fresh interactive screen" wait to avoid `window.__item` races; isolated browser context per run). Root cause of soft-lock: renderer identity tied to content id, not serve instance. | §6b lint automation (unblocks ledger sign-off) + milestone bug hardening | `npm test` PASS ×3 consecutive (stable) headless @390px; `npm run build` green with lint gate; negative-lint test confirmed catch of bad key/US-spelling/dup-id/pool | v0.2.1 |
| 2026-07-20 | Content: expanded CVC decode + spelling packs 12→**20 items each** (§6d variety floor). New words: fox, bus, hen, jam, mop, rug, web, zip (pure CVC, en-SG, real-word minimal-pair distractors; adds x/z coverage). All missedConcepts tagged to the target word's short vowel. Difficulty spread per pack: 6×d1, 8×d2, 6×d3. Pending owner sign-off before ledger tick. | Reach §6d pool floor (20/skill) for variety | `npm run lint:packs` OK (40 items, 0 warnings); `npm test` PASS | v0.2.1 |
| 2026-07-20 | **Manage students: Reset + Remove**. ChildPicker gains a "Manage" toggle; each child shows **Reset** (wipe all progress/attempts/certificates/reviews, clear `entrySkillId`, re-run the warm-up placement) and **Remove** (delete profile + all data), each behind an inline two-tap confirm (§18.12 — no native dialogs). Store: `removeChild`, `resetChild`, and a `clearChildData` helper (deletes attempts by childId index + progress/certs/reviews by key prefix in one multi-store transaction). App routes Reset → placement. ChildPicker avatars are now cards with an explicit **Play** button (was: whole-avatar button). Smoke adds a remove-student check (add → placement → Manage → Remove → confirm → gone). | Owner asked for remove/reset student management | `npm test` PASS ×2 (adds remove-student check); `npm run build` green | v0.2.14 |
| 2026-07-20 | **`srs.ts` — spaced repetition (§7)**. New `src/lib/srs.ts` (pure): `scheduleFirst` (+2d, stage 0 on new mastery), `onReviewPass` (advance +7d → +21d → graduate), `onReviewFail` (demote to +2d/stage 0), `dueReviews` (scheduled & past-due, soonest-first, cap 4). Store bumped to **DB v3** with a `reviews` object store (oldVersion-guarded migration keeps existing attempts/progress intact). Session runner: loads reviews on mount, serves **due reviews first** (easier difficulty-1 items on mastered skills) before the current-skill loop, records review pass/fail → advance/demote, and **schedules a review when a skill is newly mastered**. `window.__srs` exposed in DEV for tests. Smoke asserts the scheduling math (+2/+7/+21, pass-advance, fail-demote, due filter+cap) and that mastering a skill schedules a review. (Fresh-session behaviour unchanged — reviews aren't due yet — so existing flows stay green.) | Spaced repetition (§7) — the last M1-core engine piece | `npm test` PASS (placement→session, mastery+cert+review-scheduled, struggle→lesson, dual-gate lockout, SRS math, 0 errors, no overflow); `npm run build` green | v0.2.13 |
| 2026-07-20 | **`placement.ts` — warm-up reading placement (closes First Lesson Playable 🏁 §18.10)** + **T12 ticked**. New `src/lib/placement.ts` (staircase up the 9 dual-gated decode skills: 2 items/level, advance on both correct, stop at first not-passed → that's the entry level; ≤15 items) + `src/features/Placement.tsx` (game-framed warm-up, no right/wrong feedback, auto-advance, progress dots). `McqItem` gains a `quiet` prop (suppresses feedback/styling). App flow: add-student → **placement** → child picker; on finish, sets `child.entrySkillId` and marks all lower decode+encode skills `mastered` so the session starts at the placed level (reading level decoupled from P-level). Smoke updated to drive placement (fresh-screen gated) for both mastery (places high) and struggle (places at CVC) paths. **T12 HF first set owner-approved → ticked.** | Close the milestone: entry is now placement-driven, not first-skill | `npm test` PASS ×3 (placement→session, mastery+cert, struggle→lesson, dual-gate lockout, 0 errors, no overflow); `npm run build` green | v0.2.12 |
| 2026-07-20 | **T12 high-frequency words (first set)** + **T10 ticked**: new skill `HF-words` (recognition, `decode_choice`) in scope. Generator `scripts/gen-hf.mjs` → `phonics-L12-hf`, **55 sight-word items** + lesson (the/was/said/you/one/come/could/who/because/people/friend/school… with confusable distractors). These are non-decodable, so they use the §6a **`highFrequency` escape hatch** — a new `HF-words` envelope in `decodability.json` lists every word+distractor (graphemes empty). Concept `sight-word`. Gated after T10 (prereq PH-two-syllable) so it doesn't perturb session/placement timing; **true threading through every session is deferred to SRS/session-composition work**. **T10 owner-approved → ticked** (T02–T10 decoding ladder complete). | Add HF sight-word set (T12); tick T10 | `npm run lint:packs` OK (19 packs, 1253 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.11 |
| 2026-07-20 | **T10 two-syllable** (compound, closed VCCV, medial doubles): new skills `PH-two-syllable` (decode) + `SP-two-syllable` (encode) in scope (P1, prereq diphthongs; dual-gated). Generator `scripts/gen-two-syllable.mjs` → `phonics-L10-two-syllable` + `spelling-L10-two-syllable`, **65 items each** (maxed). Three types: compound (sun+set), closed VCCV split between the two middle consonants (nap|kin), and medial doubles that mark the split (rab|bit). Tiles stay a **flat grapheme sequence**; medial doubles bb/tt/nn/pp/dd/mm/cc/gg/rr are single tiles. Concept `syllable-{compound,vccv,double}`. Envelope adds the 9 medial-double graphemes. Lessons teach syllable division (split compounds between words; split VCCV between consonants; doubles keep the first vowel short). **T09 owner-approved → ticked.** Completes the single-syllable→two-syllable decoding ladder (T02–T10 all authored). | Start T10 (final phonics tier), maxed per §6d directive | `npm run lint:packs` OK (18 packs, 1198 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.10 |
| 2026-07-20 | **T09 diphthongs + short-oo** (oi/oy, ou/ow, aw/au, oo): new skills `PH-diphthongs` (decode) + `SP-diphthongs` (encode) in scope (P1, prereq r-controlled; dual-gated). Generator `scripts/gen-diphthongs.mjs` → `phonics-L09-diphthongs` + `spelling-L09-diphthongs`, **76 items each** (maxed). Gliding vowels as single grapheme tiles; `ow`/`oo` tiles are **reused** from T07 with their diphthong/short senses here (ow=cow not snow, oo=book not moon) — the item pool disambiguates by word. Concept `diphthong-{oi,oy,ou,ow,aw,au}` and `short-oo`. Envelope adds oi/oy/ou/aw/au. Encode lesson gives the positional spelling rules (oi mid / oy end; ou mid / ow end). **T08 owner-approved → ticked.** | Start T09, maxed per §6d directive | `npm run lint:packs` OK (16 packs, 1068 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.9 |
| 2026-07-20 | **T08 r-controlled** (ar/or/er/ir/ur): new skills `PH-r-controlled` (decode) + `SP-r-controlled` (encode) in scope (P1, prereq vowel-teams; dual-gated). Generator `scripts/gen-r-controlled.mjs` → `phonics-L08-r-controlled` + `spelling-L08-r-controlled`, **74 items each** (maxed). Each bossy-r vowel is a **single grapheme tile** (car→c·ar, bird→b·ir·d, church→ch·ur·ch). Note er/ir/ur all say /er/, so the encode lesson foregrounds the spelling-choice difficulty. Concept `r-controlled-{ar,or,er,ir,ur}`. Envelope adds the 5 r-teams. **T07 owner-approved → ticked.** | Start T08, maxed per §6d directive | `npm run lint:packs` OK (14 packs, 916 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.8 |
| 2026-07-20 | **T07 vowel teams** (ai/ay, ee/ea, oa/ow, oo, ew/ue, igh): new skills `PH-vowel-teams` (decode) + `SP-vowel-teams` (encode) in scope (P1, prereq silent-e; dual-gated). Generator `scripts/gen-vowel-teams.mjs` → `phonics-L07-vowel-teams` + `spelling-L07-vowel-teams`, **72 items each** (maxed; ~8 per team across 10 teams). Each team is a **single grapheme tile** (rain→r·ai·n, feet→f·ee·t, light→l·igh·t; `igh` is a 3-char tile). Only the **long-vowel senses** are used (ow=snow not cow; ea=leaf not bread; oo=moon not book) — the diphthong/short senses land in T08/T09. Concept `vowel-team-{ai,ay,ee,ea,oa,ow,oo,ew,ue,igh}`. Envelope adds the 10 team graphemes (greedy longest-match segments `igh` before 2-char teams before singles). Encode distractor tiles auto-include confusable teams (ai/ay, ee/ea, oa/ow). **T03/T05/T06 owner-approved → ticked.** | Start T07, maxed per §6d directive | `npm run lint:packs` OK (12 packs, 768 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.7 |
| 2026-07-20 | **T06 silent-e / magic-e** (a_e i_e o_e u_e): new skills `PH-silent-e` (decode) + `SP-silent-e` (encode) in scope (P1, prereq FLOSS; dual-gated). Generator `scripts/gen-silent-e.mjs` → `phonics-L06-silent-e` + `spelling-L06-silent-e`, **64 items each** (maxed; 16 per long vowel). First **long-vowel** pattern. Tiles are individual letters incl. the trailing silent `e` (cake→c·a·k·e); best decode distractors are the **short-vowel counterparts** (cap/cape, kit/kite, hop/hope, cub/cube) — directly teaches the magic-e effect. Concept `silent-e-{a,i,o,u}` derived from the long vowel. Envelope = FLOSS envelope (no new graphemes). Lessons explain the bossy-e rule. Note: `June`→`jute` (proper-noun capital broke tile/displayWord match; lint caught it). | Start T06, maxed per §6d directive | `npm run lint:packs` OK (10 packs, 624 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.6 |
| 2026-07-20 | **T05 FLOSS/doubling** (ff/ll/ss/zz): new skills `PH-floss` (decode) + `SP-floss` (encode) in scope (P1, prereq blends; dual-gated). Generator `scripts/gen-floss.mjs` → `phonics-L05-floss` + `spelling-L05-floss`, **58 items each** (maxed the quality FLOSS well; zz is naturally small). Doubled consonant = a **single grapheme tile** (ff/ll/ss/zz), reinforcing the FLOSS chunk (bell→b·e·ll, miss→m·i·ss). Concepts `floss-ff/ll/ss/zz` (derived from the doubled grapheme). Envelopes `PH-/SP-floss` = blends envelope + ff/ll/ss/zz. Encode lesson states the doubling rule (double f/l/s/z after a short vowel at word end). **T04 owner-approved → ticked.** | Start T05, maxed per §6d directive | `npm run lint:packs` OK (8 packs, 496 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.5 |
| 2026-07-20 | **T04 blends** (initial + final consonant blends): new skills `PH-blends` (decode) + `SP-blends` (encode) in scope (P1, prereq digraphs; dual-gated). Authored via **generator** `scripts/gen-blends.mjs` (§12 pipeline — 70-word table → both packs) → `phonics-L04-blends` + `spelling-L04-blends`, **70 items each** (maxed per §6d directive). A blend = two adjacent single-consonant graphemes (each its own tile), so words are CCVC/CVCC/CCVCC; envelope needs no new graphemes (= digraphs envelope). Covers bl/cl/fl/gl/pl/sl, br/cr/dr/fr/gr/pr/tr, sc/sk/sn/sp/st/sw/tw + final nd/nt/mp/st/sk/lt/lk/ft/nk, plus CCVCC (stand/stamp/trust/blend/frost/twist) and blend+digraph (crush/brush/crash/drink) at d3. Concepts `blend-initial`/`blend-final`. Decode distractors hand-picked (real, decodable); encode distractor tiles auto-generated from a confusable pool. Envelopes `PH-/SP-blends` added to `decodability.json`. Pending owner sign-off. | Start T04 (next phonics pattern after digraphs), maxed per §6d directive | `npm run lint:packs` OK (6 packs, 380 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.4 |
| 2026-07-20 | Content: digraph packs 24→**60 items each** (maxed the quality digraph-CVC well). +36 words/skill across sh/ch/th/ck, including double-digraph words (check/chick/chuck, back/pack/deck/lock…) and high-frequency th function words (this/that/then/them/than). Pure decodable-within-envelope, en-SG, real-word distractors (many sh/ch/th minimal pairs: shin/chin/thin, bath/bash/back), correct-choice position varied. Spread per pack ≈ 19/20/21 across difficulty 1/2/3. | Owner asked to max the digraph bank | `npm run lint:packs` OK (4 packs, 240 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.3 |
| 2026-07-20 | **T03 digraphs** (sh/ch/th/ck): new skills `PH-digraphs` (decode) + `SP-digraphs` (encode) in scope (P1, prereq CVC decode; dual-gated, encode-unlock @70%); packs `phonics-L03-digraphs` + `spelling-L03-digraphs` (24 items each: 6 words × 4 digraphs, difficulty 8/8/8; grapheme tiles treat sh/ch/th/ck as single units; distractors include confusable digraphs; correct-choice pos varied) + decode/encode lessons. Extended `decodability.json` with PH-/SP-digraphs envelopes (CVC graphemes + sh/ch/th/ck; greedy longest-match segments the digraph first). Updated smoke assertions for the larger skill graph (later skills unlock as CVC masters, so a fixed 16-item session can't master every skill → assert entry skill masters+certifies, not all). Pending owner sign-off before ledger tick. | Start T03 (next phonics pattern after CVC) | `npm run lint:packs` OK (4 packs, 168 items, 0 warnings); `npm test` PASS (mastery+cert, struggle→lesson, dual-gate lockout, 0 errors, no overflow); `npm run build` green | v0.2.2 |
| 2026-07-20 | Content: CVC packs 20→**60 items each** (maxed the quality single-consonant CVC well). +40 words/skill spanning all five short vowels (bag/bat/can/cap/fan/ham/man/map, beg/jet/leg/pet/red/set/vet/wet, big/bin/dig/fin/hit/kid/lid/win, box/cot/dot/hop/hot/job/pot/top, bug/cub/cut/gum/hug/mug/nut/run). Pure CVC, en-SG, real-word distractors, **correct-choice position varied a/b/c** (McqItem renders choices in fixed order — avoids a position tell). Spread per pack: 18×d1, 24×d2, 18×d3. | Owner asked to max the CVC bank | `npm run lint:packs` OK (120 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.1 |

**18.3 Content Pack Ledger (mandatory).** A **T-numbered checkbox ledger** lists every content pack the app needs, grouped by strand and mapped to roadmap phases. Preamble for any AI resuming the project: work top-to-bottom within the current phase; author the pack; run §6b lint; deliver to owner for review (§12.5); **tick the box only after owner sign-off, in the same change, with a changelog row. An unticked box = content not approved; NEVER build/ship UI against an unticked pack.**

- [x] T01 phonics-L01-letter-sounds (+ phoneme audio manifest) *(**ACTIVE — owner-approved 2026-07-21**. Pack (46 items, keyword-anchored choices) + 6-example lesson + `phonemes.json` manifest + `audio.phoneme()` + `phonemeId` renderer, lint-clean. Owner delivered all **44 `public/phonemes/*.m4a` clips**; SW-precaches them (59 entries). **Threaded, not gating (2026-07-21):** `threaded:true` + removed as CVC's prereq — woven in every ~8th item (rotates with HF) so a struggling reader starts on real CVC words instead of being walled at audio-only isolated sounds; choices carry keyword anchors + `LessonView` rotates examples. Smoke asserts T01 threaded/not-eligible/not-a-CVC-prereq.)*
- [x] T02 phonics-L02-cvc-short-vowels *(owner-approved 2026-07-20; 60 items, lint-clean)*
- [x] T03 phonics-L03-digraphs (sh ch th ck) *(owner-approved 2026-07-20; 60 decode + 60 encode, lint-clean)*
- [x] T04 phonics-L04-blends *(owner-approved 2026-07-20; 70 decode + 70 encode via `scripts/gen-blends.mjs`, lint-clean)*
- [x] T05 phonics-L05-floss-doubling *(owner-approved 2026-07-20; 58 decode + 58 encode via `scripts/gen-floss.mjs`, lint-clean)*
- [x] T06 phonics-L06-silent-e *(owner-approved 2026-07-20; 64 decode + 64 encode via `scripts/gen-silent-e.mjs`, lint-clean)*
- [x] T07 phonics-L07-vowel-teams *(owner-approved 2026-07-20; 72 decode + 72 encode via `scripts/gen-vowel-teams.mjs`, lint-clean)*
- [x] T08 phonics-L08-r-controlled *(owner-approved 2026-07-20; 74 decode + 74 encode via `scripts/gen-r-controlled.mjs`, lint-clean)*
- [x] T09 phonics-L09-diphthongs *(owner-approved 2026-07-20; 76 decode + 76 encode via `scripts/gen-diphthongs.mjs`, lint-clean)*
- [x] T10 phonics-L10-two-syllable *(owner-approved 2026-07-20; 65 decode + 65 encode via `scripts/gen-two-syllable.mjs`, lint-clean)*
- [ ] T11 spelling packs mirroring T01–T10 (encode items + dictation sentences) *(encode packs L02–L10 owner-approved; **dictation built** — `dictation` item type + `DictationItem` + `scoreDictation`; `dictation-L02-cvc` (20, `SP-cvc-dictation`) **+ `dictation-L03-digraphs`** (20 sh/ch/th/ck sentences, `SP-digraph-dictation`, prereq `SP-cvc-dictation`, added 2026-07-21), both lint-clean/smoke-verified, **owner-approved 2026-07-21**. Box stays open only for dictation levels beyond digraphs (blends→two-syllable, mechanical follow-ups))*
- [x] T12 high-frequency word sets (threaded) *(owner-approved 2026-07-20; 55-word set via `scripts/gen-hf.mjs`, lint-clean. **Threading now implemented** — `HF-words` is a `threaded` skill (prereq removed) served **every 4th session item** at any level via `engine.threadedSkill` (kept out of the eligible rotation), so sight words are learnt from the start, not gated at the end. Smoke asserts the cadence. Future: additional HF sets are optional breadth.)*
- [x] T13 lessons for all phonics/spelling skills *(owner-directed 2026-07-20; all 19 runtime skills — 9 decode + 9 encode + HF — ship well-formed explicit en-SG lessons, now hard-gated by `lint-packs` check (7): coverage + shape + en-SG)*
- [x] T14 grammar starter track (articles, SVA-simple) *(owner-approved 2026-07-20; `grammar-L01-articles` + `grammar-L02-sva`, 24 each + lessons. **`grammar-L03-tenses`** (`GR-tenses-basic`, 24, past/present/continuous/future) added + **owner-approved 2026-07-21**.)*
- [x] T15 vocab starter track *(owner-approved 2026-07-20; `vocab-L01-synonyms`, 24 + lesson. **`vocab-L02-antonyms`** (24) + **`vocab-L03-context`** (24 context-clue) added + **owner-approved 2026-07-21**.)*
- [x] T16 PSLE Paper-2 comprehension + cloze *(owner-approved 2026-07-20; `comp-L01` + `cloze-L01-grammar`, 24 each + lessons. **`comp-L02`** (`CM-inference`, 20 inference/evaluative) + **`cloze-L02-vocab`** (`CL-vocab-cloze`, 20 content-word word-bank) added + **owner-approved 2026-07-21**.)*
- [ ] T19 decodable connected-text reading (word→text bridge) *(**flagged by the whole-system audit #2** — the decode strand tops out at single-word reading + spelling/dictation; a decoding child never READS connected decodable text (comprehension is M3, gated high + not decodability-constrained). Needs a decodable-sentence reading item type + packs (one per phonics envelope, read-then-simple-MCQ) + lessons + owner review (§18.3). NOT yet authored.)*
- [ ] T18 advanced decode ladder (open syllables, C-le, prefixes/suffixes/morphology, schwa) *(**flagged by the 2026-07-21 OG audit #6** — the runtime decode ladder stops at two-syllable closed/compound, leaving a real upper-primary/PSLE spelling gap. New scope skills + generators + decodable packs + lessons + owner review (§18.3/§12.5) — NOT yet authored; must not ship against an unticked box.)*
- [x] T17 sentence manipulation (editing, synthesis & transformation) *(**owner-approved 2026-07-21** — MCQ-adapted forms; new strand `sentence`; `SM-editing` (`editing_mcq`, 20 items: spot-and-correct spelling/grammar/capitalisation) + `SM-synthesis` (`synthesis_mcq`, 20 items: pick the correctly combined/rewritten sentence — connectors, relative clauses, reported speech, too…to/so…that) + lessons, lint-clean, smoke-verified; deterministic exact-match, no keyboard (§13), rendered via `McqItem`, gated behind `CL-grammar-cloze`. **Free-text synthesis stays deferred** (§2/§6).)*

> **Ledger status (2026-07-20).** T02 (`phonics-L02-cvc-short-vowels`, decode), the CVC slice of T11 (`spelling-L02-cvc-short-vowels`, encode), and the CVC lessons of T13 are **authored, wired, and passing the automated §6b build-lint** (`npm run lint:packs`; **60 items each** — the quality CVC well maxed out — decodability-checked against the CVC envelope, en-SG, all missedConcepts tagged to the word's short vowel, correct-choice position varied a/b/c). **Owner-approved 2026-07-20 (§12.5)** — T02 ticked; the CVC slices of T11/T13 approved (their boxes stay open only because those T-numbers span all phonics levels, not yet authored). These are the first packs signed off and shipped to UI. Phoneme audio (T01) deferred: TTS-only this pass, `audio.phoneme()` stubbed.

**18.4 Per-feature spec format (every roadmap item).** **Objective** (pedagogical rule/behaviour, exact numbers) · **Target** (file · module · function) · **Behaviour/UI** · **Schema** (new fields: name/type/default/location, §11 updated) · **Acceptance** (how to confirm in a browser).

**18.5 Verification.** Every feature verified headless (Playwright) before marked complete: end-to-end with **zero console errors**. "Syntax valid" ≠ verified. Committed harness (`npm test`) asserts at minimum: boot/wiring smoke on every screen; mastery-gate invariants (dual decode+encode, thresholds); spaced-repetition scheduling (+2d/+7d/+21d, demotion); tile-scoring invariants (grapheme sequence match, distractor confusables); decodability lint passes for all shipped packs; placement walk-down/up logic; IndexedDB persistence + schemaVersion migration; export/import round-trip; **zero horizontal overflow at 360/390px**; a11y basics (labels, aria-live feedback, focus). Every bug fix adds a check that would catch its return.

**18.6 Cache discipline.** Any shipped-file change bumps `CACHE_VERSION` (drives the update toast, §13).

**18.7 Single source of truth.** Every word, answer key, acceptable-list, grapheme segmentation, lesson, and threshold lives in pack/config files — never hardcoded in `src/` modules. Missing content → add to pack + ledger first.

**18.8 Root-cause fixes.** Debug to actual cause before editing; record cause + fix in changelog. No symptom-patching.

**18.9 Build tooling (resolved): Vite + React + TypeScript.** vite-plugin-pwa generates the SW (precache manifest auto-includes packs/audio); GitHub Actions builds `dist/` and deploys to Pages from `main`; `CACHE_VERSION` semantics map to the generated SW revision + a visible `APP_VERSION` (package.json) for the toast/footer. Template's "no-build" rule is superseded — all other §18 rules stand.

**Module map — responsibilities (adapt as built; keep table current).**

| Module | Responsibility |
|---|---|
| `core.ts` | Constants, DOM/util helpers. No imports. |
| `ui.ts` | Themed modal/toast/confirm (no native alert/confirm/prompt); focus-trap, Escape, aria-modal, visual-viewport sized. |
| `packs.ts` | Pack loading/validation; pure lookups over content packs. |
| `engine.ts` | Mastery model, difficulty, progression, dual gates, struggle detection. |
| `srs.ts` | Spaced-repetition scheduling + session composition. |
| `placement.ts` | Warm-up placement walk. |
| `scoring.ts` | Deterministic scorers per itemType + rule-based error analysis (missedConcept). |
| `store.ts` | IndexedDB persistence, schemaVersion migration, aggregates, export/import. |
| `audio.ts` | speak()/phoneme() service (TTS + bundled clips). |
| `items/` | One renderer per itemType (tiles, MCQ, cloze…). |
| `session.ts` | Session runner state machine (items → lesson branch → summary). |
| `dashboard.ts` | Parent dashboard, readiness, action plan, usage/streak. |
| `router.ts` + `main.ts` | Screens/boot. |

Adding/moving a module: update this table **and** the SW app-shell list, bump `CACHE_VERSION` — same change.

**Actual layout as built (M1–M2, 2026-07-20):** `src/lib/packs.ts`, `src/lib/engine.ts`, `src/lib/scoring.ts`, `src/lib/audio.ts`, `src/lib/placement.ts` (warm-up staircase), `src/lib/srs.ts` (spaced repetition), `src/lib/aggregate.ts` (ISO-week rollups), `src/lib/readiness.ts` (§10 readiness + action plan), `src/lib/gamify.ts` (XP/level, pure); `src/store.ts` (persistence, **DB v4** with `reviews`/`aggregates`/`usage`/`settings` stores, oldVersion-guarded migrations, `exportAll`/`importAll` backup); `src/features/Session.tsx` (session runner; writes aggregates+usage), `src/features/Placement.tsx` (warm-up screen), `src/features/ParentDashboard.tsx` + `src/features/PinPad.tsx` (M2 PIN-gated dashboard); `src/features/items/McqItem.tsx` (all MCQ types — grammar/vocab/comprehension/visual-text — `quiet` prop, `phonemeId` branch, optional `passage`, `Choice.keyword` anchor scaffold for letter-sounds), `src/features/items/TileItem.tsx` (build_word/spell_tiles), `src/features/items/ClozeItem.tsx` (grammar_cloze word-bank), `src/features/items/DictationItem.tsx` (**dictation — word-by-word sentence build, T11**); `src/features/{ChildPicker,AddStudent,LessonView}.tsx`, `src/features/Trophies.tsx` (child-facing trophy room — level/XP bar, badges, certificates; §14), `src/features/M3Demo.tsx` (DEV `#m3demo` render harness); `src/App.tsx` (router/boot; add→placement→pick, + dashboard + trophies routes); `src/data/scopeAndSequence.json` (skills may carry `enabled:false` = authored-but-inert; `packs.SKILLS` drops them and strips prereqs pointing at them) + `src/data/packs/*.json`; `src/data/decodability.json` (§6a envelopes) + `src/data/phonemes.json` (§6c phoneme-clip manifest, files under `public/phonemes/*.m4a`, played by `audio.phoneme()`) + `src/data/graphemeConcepts.json` (§7 grapheme→error-concept map for grapheme-level scoring, from `gen-grapheme-concepts.mjs`) + `scripts/lint-packs.mjs` (§6b build gate) + `scripts/gen-*.mjs` (pack generators) + `test/smoke.mjs` (§18.5 harness). **Not yet built:** `ui.ts` (shared modal/toast primitives — M4 polish); M3 strand packs (grammar/vocab/cloze/comprehension/synthesis).

**18.10 Milestone — First Lesson Playable 🏁.** Add student → warm-up placement → decode + spell-tiles items → struggle triggers Lesson → resume → certificate — end-to-end **offline**, verified on iPad Safari (or simulated viewport). M2+ features are gated on this milestone. **Status (2026-07-20): MET** ✅ — `npm test` drives the full flow (add student → **warm-up placement walk** → session seeded at the placed level → decode + spell-tiles → struggle→Lesson → certificate), offline, 390px, zero console errors. `placement.ts` + `Placement.tsx` built: staircase up the 9-level decode ladder, ≤15 items, no right/wrong feedback, places at the first un-passed level and marks lower levels mastered.

**18.11 Content & pedagogy audit (before "done").** Re-verify the finished app against spec + packs: every answer key resolves; decodability holds for every shipped item; en-SG spelling throughout; grapheme segmentations correct; mastery/SRS gating and once-per-X behaviours match §7 exactly (audit hardest on *engine behaviour* — reference projects found data layers clean but engine sequencing deviating). Findings = numbered work-list (Rule/Target/Fix/Why); each closed with a regression check; record what was verified clean.

**18.12 UI primitives & a11y.** No native dialogs; shared modal/toast primitives; keyboard + screen-reader usable; labelled icon buttons; aria-live for answer feedback; phone-first, zero horizontal overflow at 360px.

---

*End of CLAUDE.md. Build M0→M1→M2→M3→M4. Keep the P1–P6 scope-and-sequence sacred; all content en-SG, static, decodability-linted, fully offline; deterministic scoring only; make the parent dashboard honest and growth-framed.*
