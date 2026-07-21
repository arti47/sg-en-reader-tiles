// §6b content-pack build lint. Fails the build on any violation (CI-style).
// Checks: (1) answer keys resolve, (2) exactly one correct answer per item,
// (3) en-SG spelling (US-variant blacklist), (4) §6a decodability, (5) no
// duplicate item ids, (6) pool size (hard floor = mastery.minItems; warn <20).
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src', 'data')
const packDir = join(dataDir, 'packs')
const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'))

const scope = readJSON(join(dataDir, 'scopeAndSequence.json'))
const decode = readJSON(join(dataDir, 'decodability.json'))
const phonemes = readJSON(join(dataDir, 'phonemes.json'))
const skills = new Map(scope.levels.flatMap(l => l.skills).map(s => [s.id, s]))
const packs = readdirSync(packDir).filter(f => f.endsWith('.json')).map(f => ({ f, pack: readJSON(join(packDir, f)) }))
const packById = new Map(packs.map(({ pack }) => [pack.packId, pack]))

const errors = []
const warnings = []
const err = (f, id, m) => errors.push(`${f} :: ${id || '-'} :: ${m}`)
const warn = (f, id, m) => warnings.push(`${f} :: ${id || '-'} :: ${m}`)

// (3) common US spellings → en-SG. Whole-word, case-insensitive.
const US = ['color', 'favorite', 'honor', 'honored', 'center', 'meter', 'liter', 'realize', 'realized',
  'organize', 'organized', 'recognize', 'traveled', 'traveling', 'neighbor', 'gray', 'defense',
  'offense', 'analyze', 'catalog', 'dialog', 'jewelry', 'plow', 'mold', 'apologize', 'behavior',
  'flavor', 'labor', 'neighborhood', 'theater', 'canceled']
const usRe = new RegExp('\\b(' + US.join('|') + ')\\b', 'i')
const scanEnSG = (f, id, text) => { if (text && usRe.test(text)) err(f, id, `US spelling in text: "${text.match(usRe)[0]}"`) }

// (4) greedy longest-match segmentation into allowed graphemes.
function decodable(word, env) {
  const cfg = decode[env]; if (!cfg) return { ok: false, why: `no decodability envelope "${env}"` }
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (cfg.highFrequency?.map(h => h.toLowerCase()).includes(w)) return { ok: true }
  const gs = [...cfg.graphemes].sort((a, b) => b.length - a.length)
  let i = 0
  while (i < w.length) {
    const g = gs.find(g => w.startsWith(g, i))
    if (!g) return { ok: false, why: `"${word}" not decodable within ${env} (stuck at "${w.slice(i)}")` }
    i += g.length
  }
  return { ok: true }
}

// Canonical grapheme segmentation (greedy longest-match) → the tile chunking encode items
// must use, so digraphs/teams/doubles are single tiles (OG chunking, §13). Null if undecodable.
function segment(word, env) {
  const cfg = decode[env]; if (!cfg) return null
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  const gs = [...cfg.graphemes].sort((a, b) => b.length - a.length)
  const out = []; let i = 0
  while (i < w.length) {
    const g = gs.find(g => w.startsWith(g, i))
    if (!g) return null
    out.push(g); i += g.length
  }
  return out
}

const allItemIds = new Map() // id → file
const skillItemCount = new Map()

for (const { f, pack } of packs) {
  if (!pack.packId) err(f, '', 'missing packId')
  for (const it of pack.items ?? []) {
    // (5) duplicate ids
    if (allItemIds.has(it.id)) err(f, it.id, `duplicate item id (also in ${allItemIds.get(it.id)})`)
    allItemIds.set(it.id, f)

    const skill = skills.get(it.skillId)
    if (!skill) { err(f, it.id, `unknown skillId "${it.skillId}"`); continue }
    if (skill.itemPool !== pack.packId) err(f, it.id, `skill.itemPool (${skill.itemPool}) != packId (${pack.packId})`)
    skillItemCount.set(it.skillId, (skillItemCount.get(it.skillId) ?? 0) + 1)

    if (!it.missedConceptOnFail) err(f, it.id, 'missing missedConceptOnFail (error taxonomy)')

    // phoneme prompt (§6c) must resolve to a manifested clip
    if (it.phonemeId && !phonemes[it.phonemeId]) err(f, it.id, `phonemeId "${it.phonemeId}" not in phonemes.json`)

    // (1)(2) answer keys
    const mcqTypes = ['grammar_mcq', 'decode_choice', 'vocab_mcq', 'vocab_cloze_mcq', 'passage_question', 'visual_text', 'editing_mcq', 'synthesis_mcq']
    if (mcqTypes.includes(it.itemType)) {
      const ids = (it.choices ?? []).map(c => c.id)
      if (ids.length < 2) err(f, it.id, 'MCQ needs ≥2 choices')
      if (new Set(ids).size !== ids.length) err(f, it.id, 'duplicate choice ids')
      if (!it.correctChoiceId) err(f, it.id, 'missing correctChoiceId')
      else if (!ids.includes(it.correctChoiceId)) err(f, it.id, `correctChoiceId "${it.correctChoiceId}" not among choices`)
      // distractors must be distinct from each other and the key (no accidental second-correct)
      const labels = (it.choices ?? []).map(c => (c.label ?? '').toLowerCase())
      if (new Set(labels).size !== labels.length) err(f, it.id, `duplicate choice labels ${JSON.stringify(it.choices.map(c => c.label))}`)
    } else if (it.itemType === 'grammar_cloze') {
      const bank = it.wordBank ?? []
      if (bank.length < 2) err(f, it.id, 'grammar_cloze needs a word bank (≥2 words)')
      if (!(it.blanks ?? []).length) err(f, it.id, 'grammar_cloze needs blanks')
      for (const b of it.blanks ?? []) {
        if (!(b.acceptable ?? []).length) err(f, it.id, `blank ${b.id} has no acceptable answers`)
        for (const acc of b.acceptable ?? []) if (!bank.includes(acc)) err(f, it.id, `blank ${b.id} accepts "${acc}" which is not in the word bank`)
      }
    } else if (it.itemType === 'build_word' || it.itemType === 'spell_tiles') {
      if (!Array.isArray(it.graphemes) || !it.graphemes.length) err(f, it.id, 'missing graphemes')
      else if (it.displayWord && it.graphemes.join('') !== it.displayWord) err(f, it.id, `graphemes ${JSON.stringify(it.graphemes)} != displayWord "${it.displayWord}"`)
      // graphemes must be the canonical greedy chunking (single-tile digraphs/teams/doubles, §13)
      else if (it.displayWord && it.decodableWithin) {
        const canon = segment(it.displayWord, it.decodableWithin)
        if (canon && canon.join('|') !== it.graphemes.join('|'))
          err(f, it.id, `graphemes ${JSON.stringify(it.graphemes)} not canonical for "${it.displayWord}" (expected ${JSON.stringify(canon)})`)
      }
    } else if (it.itemType === 'dictation') {
      // each word: graphemes present, join === text, canonical greedy chunking (§13)
      if (!Array.isArray(it.words) || it.words.length < 2) err(f, it.id, 'dictation needs ≥2 words')
      for (const w of it.words ?? []) {
        if (!Array.isArray(w.graphemes) || !w.graphemes.length) { err(f, it.id, `word "${w.text}" missing graphemes`); continue }
        if (w.graphemes.join('') !== w.text) err(f, it.id, `word graphemes ${JSON.stringify(w.graphemes)} != "${w.text}"`)
        else if (it.decodableWithin) {
          const canon = segment(w.text, it.decodableWithin)
          if (canon && canon.join('|') !== w.graphemes.join('|'))
            err(f, it.id, `word "${w.text}" graphemes not canonical (expected ${JSON.stringify(canon)})`)
        }
      }
    }

    // (3) en-SG on all human-facing text
    for (const t of [it.stem, it.rationale, it.displayWord, it.audioText, ...(it.choices ?? []).map(c => c.label)]) scanEnSG(f, it.id, t)

    // (4) decodability — phonics/spelling only
    if (skill.strand === 'phonics' || skill.strand === 'spelling') {
      const env = it.decodableWithin
      if (!env) err(f, it.id, 'missing decodableWithin')
      else if (it.itemType === 'dictation') {
        for (const w of it.words ?? []) { const r = decodable(w.text, env); if (!r.ok) err(f, it.id, r.why) }
      } else {
        const words = []
        if (it.displayWord) words.push(it.displayWord)
        if (it.audioText) words.push(it.audioText)
        for (const c of it.choices ?? []) words.push(c.label)
        for (const w of words) { const r = decodable(w, env); if (!r.ok) err(f, it.id, r.why) }
      }
    }
  }
}

// (7) lessons (§8, T13): every runtime skill must ship a well-formed, en-SG explicit lesson
// in its pool pack — the struggle→lesson branch has nothing to serve otherwise.
for (const [sid, skill] of skills) {
  const L = packById.get(skill.itemPool)?.lessons?.[sid]
  if (!L) { err('-', sid, `no lesson in pack ${skill.itemPool} (§8/T13)`); continue }
  if (!L.iCanStatement?.trim()) err(skill.itemPool, sid, 'lesson missing iCanStatement')
  if (!L.explanation || L.explanation.trim().length < 10) err(skill.itemPool, sid, 'lesson explanation missing/too short')
  if (!Array.isArray(L.workedExamples) || L.workedExamples.length < 1) err(skill.itemPool, sid, 'lesson needs ≥1 worked example')
  else L.workedExamples.forEach((ex, i) => {
    if (!ex?.text?.trim() || !ex?.note?.trim()) err(skill.itemPool, sid, `worked example ${i} missing text/note`)
  })
  for (const t of [L.iCanStatement, L.explanation, ...(L.workedExamples ?? []).flatMap(e => [e?.text, e?.note])]) scanEnSG(skill.itemPool, sid, t)
}

// (6) pool size
for (const [sid, skill] of skills) {
  const n = skillItemCount.get(sid) ?? 0
  if (n === 0) { warn('-', sid, 'no items authored yet'); continue }
  if (n < skill.mastery.minItems) err('-', sid, `pool ${n} < mastery.minItems ${skill.mastery.minItems} (unreachable)`)
  else if (n < 20) warn('-', sid, `pool ${n} < 20 (author more for variety, §6d)`)
}

for (const w of warnings) console.warn('WARN ', w)
if (errors.length) {
  for (const e of errors) console.error('ERROR', e)
  console.error(`\n§6b lint FAILED: ${errors.length} error(s), ${warnings.length} warning(s).`)
  process.exit(1)
}
console.log(`§6b lint OK: ${packs.length} pack(s), ${allItemIds.size} item(s), ${warnings.length} warning(s).`)
