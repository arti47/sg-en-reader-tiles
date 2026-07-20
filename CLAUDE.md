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

**Multisensory (OG requirement):** pair sound + visual + motor (tile drag, typing) for every phonics/spelling pattern.

---

## 7. Adaptive Engine

**Mastery model.** Rolling-window accuracy per (child, skill), gated by `minItems`. (Interface kept clean so a Bayesian/BKT upgrade can drop in later.)

**Difficulty (1–3) within a skill.** Start at 1. Correct streak of 3 → +1 (cap 3); 2 wrong in recent window → −1 (floor 1). Difficulty flows into generation (harder distractors, subtler nuance, longer/lower-frequency vocabulary, PSLE-length passages at level 3).

**Dual mastery gates (phonics patterns).** A pattern is mastered only when BOTH its decode skill and its encode (spelling) skill pass. Encode unlocks after decode reaches ~70% (guided overlap), but certificate/advancement requires both.

**Spaced repetition (replaces vague "review %").** On mastery, schedule reviews at **+2d, +7d, +21d**. Session composition: due reviews first (cap ~4/session), then current-skill items. A failed review demotes the skill to `review-active` (short re-practice block, easier items) until re-passed. Post-M4: tune intervals.

**Error taxonomy (missedConcept).** Fixed enum per strand, defined in scopeAndSequence.json alongside skills — e.g. phonics: `digraph-sh`, `vowel-short-a`, `blend-final`, `silent-e`; spelling: `doubling-rule`, `vowel-team-choice`; grammar: `sva-neither-nor`, `tense-past-perfect`. Generators and scorers must emit tags from the enum only. Drives struggle detection, Lesson targeting, and dashboard "stuck on" reporting.

**Progression pseudocode:**
```
onAnswer(child, skill, item, result):
  record(result)                              # feeds AWT + mastery
  updateDifficulty(child, skill, result)
  m = rollingAccuracy(child, skill, window)
  n = itemsAnswered(child, skill)
  if n >= skill.mastery.minItems and m >= skill.mastery.accuracyToPass:
      awardCertificate(child, skill)          # "I can…" statement
      advance(child, nextUnlockedSkill(child))   # respects prereqs
  elif strugglingSignal(child, skill):        # m < 0.5 over >= 6 items, or repeated same-concept miss
      branchToLesson(child, skill)
  else:
      continuePractice(child, skill)
```

**Struggle branching (blended-model equivalent):** Lesson (explicit rule + worked examples + guided items) → Practice (easier extra items on the skill) → resume.

**Placement (dual — critical for this audience).** Capture **chronological P-level** at add-time (sets PSLE-component expectations), then run an **independent reading placement** that finds true instructional level per strand by walking **down** on failure / **up** on success. For struggling readers these diverge — place content by **reading level, not P-level**. Start decoding placement low and confirm foundations before advancing. Keep placement short (≤ ~15 items) and low-pressure: **frame it as a warm-up game, show no right/wrong feedback during placement**, end on an achievable item.

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

**Child-facing:** big, low-clutter, audio-assisted for lower primary. Child picker (avatar tiles) → Home (Play, strand chooser of *unlocked* strands, XP/streak, nearest certificate) → Session runner (one item at a time, large tap targets, immediate feedback, session progress dots, prompts read aloud) → Lesson view (visually distinct "we're learning something new") → Certificate (celebratory, savable/printable).

**Parent dashboard (PIN-gated):** per-child card (current reading level vs P-level, readiness traffic-light, **"N of M sessions this week" + weekly streak** — fidelity mechanic, mirrors Core5 usage targets; per-child `weeklySessionTarget`, default 4); **action plan** (one recommended action, stuck-on error tags, recent certificates); progress chart from `aggregates` (never truncated); export/reset.

**Add-Student flow:** from Child picker → "Add student" → enter name + chronological P-level + optional difficulty flags → run reading placement → profile created. Editable/removable later.

**Constraints — dyslexia-friendly by DEFAULT (not opt-in):** OpenDyslexic/sans-serif font, generous letter/line spacing, off-white background, high contrast, large tap targets, short lines, audio-first prompts, **no timing pressure by default** (sight-word timing is opt-in only), reduced-motion, adjustable TTS rate/session length. No ads, no external links, nothing unsuitable for children. Feedback is encouraging and never failure-framed; celebrate small wins.

---

## 15. Roadmap (build in order)

**M0 — Skeleton.** Shell, **add-student flow + profiles** + storage, TTS wrapper, one `grammar_mcq` item end-to-end. *Accept:* add a student with a P-level, answer one item, feedback shown, attempt persisted.

**M1 — MVP (decoding + spelling engine).** Full phonics + spelling scope-and-sequence with dual mastery gates; phoneme audio assets; `decode_choice`/`build_word`/`spell_tiles`/`dictation` tile renderers; content packs (curated word lists, §6b build-lint); placement (warm-up framing); struggle→Lesson→Practice; spaced repetition; certificates. *Accept:* a struggling reader is placed below P-level, works adaptively through patterns needing BOTH decode+encode to advance, gets re-taught on struggle, earns a certificate — fully offline.

**M2 — Dashboard + readiness.** AWT analytics, aggregates, usage targets/streak, action plan with error-tag reporting, AL-framed readiness (parent-only), export/import, schemaVersion migration stub. *Accept:* accurate per-child status + one useful action.

**M3 — PSLE Paper-2 strands.** Grammar, Vocabulary, Cloze, Comprehension, Sentence Manipulation (MCQ + acceptable-list scoring; free-text deferred), visual text — passages decodability-constrained until decoding clears. *Accept:* all strands playable, validly sequenced.

**M4 — Polish.** Gamification depth, accessibility pass, dyslexia font, background cache pre-warming, threshold tuning against real use.

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

**18.1 Living spec.** This CLAUDE.md is canonical. **Every code change updates it in the same change** — features, data model, file/module tables, roadmap checkboxes, ledger ticks, changelog. A code change with a stale CLAUDE.md is incomplete. All work merges to `main` (= deploy).

**18.2 Changelog table.** Every change appends a dated row: what · why · root cause (for fixes) · verification performed · CACHE_VERSION.

| Date | Change | Why | Verification | Cache |
|---|---|---|---|---|
| 2026-07-20 | Spec instantiated | Project start | — | — |
| 2026-07-20 | M0 scaffold: Vite+React+TS+PWA, Actions→Pages, IndexedDB store, add-student, ChildPicker, one grammar_mcq loop, update-toast, dyslexia-first styles | First Session Playable milestone start | Offline env — build verified via Actions on push | v0.1.0 |
| 2026-07-20 | M1 first increment: adaptive engine (`engine.ts` — rolling-window mastery, difficulty 1–3, dual decode+encode gate, encode-unlock @70%, struggle→lesson), scope&sequence loader (`packs.ts`, `scopeAndSequence.json`), tile encode renderer (`build_word`) + `decode_choice` MCQ renderer, `scoring.scoreTiles` grapheme-sequence match, `audio.ts` TTS `speak()` (en-GB) + stubbed `phoneme()`, real Session runner (interleaved skills, SESSION_LEN=16, certificates), store schema v2 (attempts keyed by uuid + childId index, progress/certificates stores). CVC short-vowel decode+spelling packs (12 items each) + lessons. Committed `npm test` Playwright harness. Root-cause: tsconfig.node `noEmit` broke `tsc -b` (TS6310) → emitDeclarationOnly+outDir. | M1 MVP core (decoding+spelling engine) start; reaches First Lesson Playable 🏁 (§18.10) | `npm test` PASS headless @390px: mastery→2 certs, dual-gate lockout (encode stays locked when decode <70%), struggle→lesson fires once, zero console errors, no horizontal overflow; `npm run build` green | v0.2.0 |
| 2026-07-20 | §6b build-lint (`scripts/lint-packs.mjs` + `src/data/decodability.json`): validates answer-key resolution, one-correct-per-item, en-SG (US-spelling blacklist), §6a decodability (greedy grapheme segmentation per envelope), duplicate item ids, pool floor (=mastery.minItems, warn <20); wired into `build` as a hard gate + `lint:packs` script. Removed orphaned M0 `grammar-L01-articles` pack (skill not in runtime scope; grammar is M3/T14) — lint caught the dangling skill ref. **App bug fixed** (lint/harness surfaced it): when `pickItem` recycled the pool and re-served the same item id, the item renderer kept its `key={item.id}` so React reused the mounted `McqItem`/`TileItem` with stale internal `picked`/`built` state → item appeared pre-answered with no Continue (a child would soft-lock too). Fix: key renderer by a per-serve counter (`serve`) so every serve remounts fresh. Hardened smoke harness (spawn Vite JS entry + reliable kill; DOM-gated "fresh interactive screen" wait to avoid `window.__item` races; isolated browser context per run). Root cause of soft-lock: renderer identity tied to content id, not serve instance. | §6b lint automation (unblocks ledger sign-off) + milestone bug hardening | `npm test` PASS ×3 consecutive (stable) headless @390px; `npm run build` green with lint gate; negative-lint test confirmed catch of bad key/US-spelling/dup-id/pool | v0.2.1 |
| 2026-07-20 | Content: expanded CVC decode + spelling packs 12→**20 items each** (§6d variety floor). New words: fox, bus, hen, jam, mop, rug, web, zip (pure CVC, en-SG, real-word minimal-pair distractors; adds x/z coverage). All missedConcepts tagged to the target word's short vowel. Difficulty spread per pack: 6×d1, 8×d2, 6×d3. Pending owner sign-off before ledger tick. | Reach §6d pool floor (20/skill) for variety | `npm run lint:packs` OK (40 items, 0 warnings); `npm test` PASS | v0.2.1 |
| 2026-07-20 | Content: CVC packs 20→**60 items each** (maxed the quality single-consonant CVC well). +40 words/skill spanning all five short vowels (bag/bat/can/cap/fan/ham/man/map, beg/jet/leg/pet/red/set/vet/wet, big/bin/dig/fin/hit/kid/lid/win, box/cot/dot/hop/hot/job/pot/top, bug/cub/cut/gum/hug/mug/nut/run). Pure CVC, en-SG, real-word distractors, **correct-choice position varied a/b/c** (McqItem renders choices in fixed order — avoids a position tell). Spread per pack: 18×d1, 24×d2, 18×d3. | Owner asked to max the CVC bank | `npm run lint:packs` OK (120 items, 0 warnings); `npm test` PASS; `npm run build` green | v0.2.1 |

**18.3 Content Pack Ledger (mandatory).** A **T-numbered checkbox ledger** lists every content pack the app needs, grouped by strand and mapped to roadmap phases. Preamble for any AI resuming the project: work top-to-bottom within the current phase; author the pack; run §6b lint; deliver to owner for review (§12.5); **tick the box only after owner sign-off, in the same change, with a changelog row. An unticked box = content not approved; NEVER build/ship UI against an unticked pack.**

- [ ] T01 phonics-L01-letter-sounds (+ phoneme audio manifest)
- [x] T02 phonics-L02-cvc-short-vowels *(owner-approved 2026-07-20; 60 items, lint-clean)*
- [ ] T03 phonics-L03-digraphs (sh ch th ck)
- [ ] T04 phonics-L04-blends
- [ ] T05 phonics-L05-floss-doubling
- [ ] T06 phonics-L06-silent-e
- [ ] T07 phonics-L07-vowel-teams
- [ ] T08 phonics-L08-r-controlled
- [ ] T09 phonics-L09-diphthongs
- [ ] T10 phonics-L10-two-syllable
- [ ] T11 spelling packs mirroring T01–T10 (encode items + dictation sentences) *(CVC slice `spelling-L02-cvc-short-vowels` owner-approved 2026-07-20, 60 items; remaining levels + dictation pending)*
- [ ] T12 high-frequency word sets (threaded)
- [ ] T13 lessons for all phonics/spelling skills *(CVC decode + spell lessons owner-approved 2026-07-20; remaining skills pending)*
- [ ] T14 grammar starter track (articles, SVA-simple, tenses-basic)
- [ ] T15 vocab starter track
- [ ] T16+ PSLE Paper-2 packs (M3; enumerate when reached)

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

**Actual layout as built (M1, 2026-07-20):** `src/lib/packs.ts`, `src/lib/engine.ts`, `src/lib/scoring.ts`, `src/lib/audio.ts`; `src/store.ts` (persistence; schemaVersion migration + aggregates/export-import still TODO); `src/features/Session.tsx` (session runner); `src/features/items/McqItem.tsx` (grammar_mcq + decode_choice), `src/features/items/TileItem.tsx` (build_word/spell_tiles); `src/features/{ChildPicker,AddStudent,LessonView}.tsx`; `src/App.tsx` (router/boot); `src/data/scopeAndSequence.json` + `src/data/packs/*.json`; `src/data/decodability.json` (§6a envelopes) + `scripts/lint-packs.mjs` (§6b build gate) + `test/smoke.mjs` (§18.5 harness). **Not yet built:** `srs.ts` (spaced repetition), `placement.ts` (warm-up walk), `ui.ts` (shared modal/toast primitives), `dashboard.ts`, export/import — all M1-remaining / M2.

**18.10 Milestone — First Lesson Playable 🏁.** Add student → warm-up placement → decode + spell-tiles items → struggle triggers Lesson → resume → certificate — end-to-end **offline**, verified on iPad Safari (or simulated viewport). M2+ features are gated on this milestone. **Status (2026-07-20): substantially met** via `npm test` (add student → decode + spell-tiles → struggle→Lesson → certificate, offline, 390px). Gap: placement walk (`placement.ts`) not yet built — entry is currently first-skill, not placement-driven; this remains before the milestone is fully closed.

**18.11 Content & pedagogy audit (before "done").** Re-verify the finished app against spec + packs: every answer key resolves; decodability holds for every shipped item; en-SG spelling throughout; grapheme segmentations correct; mastery/SRS gating and once-per-X behaviours match §7 exactly (audit hardest on *engine behaviour* — reference projects found data layers clean but engine sequencing deviating). Findings = numbered work-list (Rule/Target/Fix/Why); each closed with a regression check; record what was verified clean.

**18.12 UI primitives & a11y.** No native dialogs; shared modal/toast primitives; keyboard + screen-reader usable; labelled icon buttons; aria-live for answer feedback; phone-first, zero horizontal overflow at 360px.

---

*End of CLAUDE.md. Build M0→M1→M2→M3→M4. Keep the P1–P6 scope-and-sequence sacred; all content en-SG, static, decodability-linted, fully offline; deterministic scoring only; make the parent dashboard honest and growth-framed.*
