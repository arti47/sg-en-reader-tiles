// T18a prefix generator (§12). Emits phonics-L12-prefixes.json + spelling-L12-prefixes.json —
// the prefix rung of the morphology tier, above suffixes (§5). Common prefixes un-/re-/dis-/mis-/
// non-/pre- on decodable bases. Prefix letters decompose into already-taught graphemes (no new
// tiles), so the envelope equals the two-syllable one; all words are phonically transparent
// (blend straight through), so decode and encode use the same list. Run: node scripts/gen-prefixes.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const decode = JSON.parse(readFileSync(join(dir, 'decodability.json'), 'utf8'))
function segment(word, env) {
  const gs = [...decode[env].graphemes].sort((a, b) => b.length - a.length)
  const w = word.toLowerCase(); const out = []; let i = 0
  while (i < w.length) { const g = gs.find(g => w.startsWith(g, i)); if (!g) throw new Error(`${word} not decodable in ${env} at ${w.slice(i)}`); out.push(g); i += g.length }
  return out
}
// [word, difficulty, prefix] — bases are decodable within the two-syllable envelope.
const WORDS = [
  ['undo', 1, 'un'], ['unfit', 1, 'un'], ['unzip', 1, 'un'], ['unlock', 2, 'un'], ['unpack', 2, 'un'],
  ['undid', 2, 'un'], ['unwell', 2, 'un'], ['unlit', 2, 'un'], ['unhappy', 3, 'un'], ['unpin', 1, 'un'],
  ['redo', 1, 're'], ['refill', 2, 're'], ['reset', 2, 're'], ['retell', 2, 're'], ['repack', 2, 're'],
  ['rerun', 2, 're'], ['reheat', 3, 're'],
  ['distrust', 3, 'dis'], ['dismiss', 3, 'dis'], ['discuss', 3, 'dis'],
  ['mistrust', 3, 'mis'], ['misfit', 2, 'mis'], ['mishap', 2, 'mis'],
  ['nonstop', 2, 'non'], ['nonfat', 2, 'non'], ['preset', 2, 'pre']
]
const dists = WORDS.map(w => w[0])
const num = i => String(i + 1).padStart(2, '0')
const POOL = ['bb', 'tt', 'nn', 'pp', 'dd', 'gg', 'ck', 'sh', 'ch', 'th', 'a', 'e', 'i', 'o', 'u', 'b', 'd', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'z']
const encDist = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)

const decodeItems = WORDS.map(([w, d], i) => {
  const others = [dists[(i + 1) % dists.length], dists[(i + 3) % dists.length]]
  const pos = i % 3
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-pf-${num(i)}`, skillId: 'PH-prefixes', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: 'prefix', rationale: `${w} — read the prefix, then the base word.`, decodableWithin: 'PH-prefixes' }
})
const spellItems = WORDS.map(([w, d], i) => {
  const g = segment(w, 'SP-prefixes')
  return { id: `sp-pf-${num(i)}`, skillId: 'SP-prefixes', itemType: 'build_word', difficulty: d,
    stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
    distractorGraphemes: encDist(g, d), missedConceptOnFail: 'prefix', rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-prefixes' }
})
const phLesson = { 'PH-prefixes': { iCanStatement: 'I can read words that start with a prefix.',
  explanation: "A prefix is a small part added to the START of a base word: un + do = undo, re + fill = refill, dis + like = dislike. To read a long word, cover the prefix, read the base word you know, then add the prefix back on.",
  workedExamples: [{ text: 'undo', note: 'un + do → undo (not do)' }, { text: 'refill', note: 're + fill → refill (fill again)' }] } }
const spLesson = { 'SP-prefixes': { iCanStatement: 'I can spell words that start with a prefix.',
  explanation: "Prefixes are just added to the front — the base word does not change its spelling: un + happy = unhappy, mis + trust = mistrust. Build the prefix, then the base word.",
  workedExamples: [{ text: 'unlock', note: 'un + lock — spell the base lock as usual' }, { text: 'nonstop', note: 'non + stop' }] } }

writeFileSync(join(dir, 'packs', 'phonics-L12-prefixes.json'), JSON.stringify({ packId: 'phonics-L12-prefixes', strand: 'phonics', skillIds: ['PH-prefixes'], version: 1, items: decodeItems, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'packs', 'spelling-L12-prefixes.json'), JSON.stringify({ packId: 'spelling-L12-prefixes', strand: 'spelling', skillIds: ['SP-prefixes'], version: 1, items: spellItems, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decodeItems.length} decode + ${spellItems.length} encode prefix items.`)
