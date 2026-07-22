// T18b consonant-le generator (§12). Emits phonics-L13-c-le.json + spelling-L13-c-le.json — the
// final-stable-syllable rung (§5). Words end in a consonant + "le" (little, apple, candle). "le"
// is a single OG syllable tile (added to the PH-/SP-c-le envelope); words keep a CLOSED first
// syllable (short vowel) so they stay fully decodable — no open-syllable long-vowel ambiguity.
// Run: node scripts/gen-cle.mjs
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
// [word, difficulty] — closed first syllable (short vowel) + C-le.
const WORDS = [
  ['little', 1], ['apple', 1], ['middle', 2], ['bottle', 2], ['puzzle', 2], ['giggle', 2], ['wiggle', 2],
  ['bubble', 2], ['pebble', 3], ['saddle', 2], ['paddle', 2], ['kettle', 2], ['settle', 3], ['tickle', 2],
  ['pickle', 2], ['candle', 2], ['handle', 2], ['jungle', 3], ['simple', 3], ['sample', 3], ['rattle', 2],
  ['cattle', 2], ['nozzle', 3], ['tackle', 2], ['buckle', 3], ['ripple', 3], ['dazzle', 3], ['cuddle', 2],
  ['muddle', 3], ['dimple', 3]
]
const dists = WORDS.map(w => w[0])
const num = i => String(i + 1).padStart(2, '0')
const POOL = ['le', 'bb', 'tt', 'nn', 'pp', 'dd', 'gg', 'zz', 'ck', 'a', 'e', 'i', 'o', 'u', 'b', 'd', 'g', 'k', 'm', 'n', 'p', 'r', 's', 't']
const encDist = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)

const decodeItems = WORDS.map(([w, d], i) => {
  const others = [dists[(i + 1) % dists.length], dists[(i + 4) % dists.length]]
  const pos = i % 3
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-cle-${num(i)}`, skillId: 'PH-c-le', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: 'c-le', rationale: `${w} — the ending "le" sounds like /ul/.`, decodableWithin: 'PH-c-le' }
})
const spellItems = WORDS.map(([w, d], i) => {
  const g = segment(w, 'SP-c-le')
  return { id: `sp-cle-${num(i)}`, skillId: 'SP-c-le', itemType: 'build_word', difficulty: d,
    stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
    distractorGraphemes: encDist(g, d), missedConceptOnFail: 'c-le', rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-c-le' }
})
const phLesson = { 'PH-c-le': { iCanStatement: 'I can read words that end in a consonant plus le.',
  explanation: "Many longer words end in a consonant followed by 'le' — like ap-ple, lit-tle, can-dle. That final 'le' chunk sounds like /ul/. Read the first chunk, then add the consonant-le chunk: /ul/.",
  workedExamples: [{ text: 'little', note: 'lit + tle → little' }, { text: 'candle', note: 'can + dle → candle' }] } }
const spLesson = { 'SP-c-le': { iCanStatement: 'I can spell words that end in a consonant plus le.',
  explanation: "The /ul/ sound at the end of these words is spelt with the consonant + le. After a short vowel the consonant is often doubled: ap-ple, lit-tle, bub-ble. Build the first chunk, then the consonant and the 'le' tile.",
  workedExamples: [{ text: 'apple', note: 'a + pp + le — double p, then le' }, { text: 'candle', note: 'c-a-n-d + le' }] } }

writeFileSync(join(dir, 'packs', 'phonics-L13-c-le.json'), JSON.stringify({ packId: 'phonics-L13-c-le', strand: 'phonics', skillIds: ['PH-c-le'], version: 1, items: decodeItems, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'packs', 'spelling-L13-c-le.json'), JSON.stringify({ packId: 'spelling-L13-c-le', strand: 'spelling', skillIds: ['SP-c-le'], version: 1, items: spellItems, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decodeItems.length} decode + ${spellItems.length} encode c-le items.`)
