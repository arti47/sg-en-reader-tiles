// T20 ng/nk generator (§19.13.5). Emits phonics-L14-ng.json + spelling-L14-ng.json.
// The final nasals /ng/ (ring, song) and /ngk/ (bank, think) — each a SINGLE grapheme
// tile (ng, nk). Words are short-vowel-closed, optionally with a taught initial blend/
// digraph, so they stay decodable within the blends envelope + ng/nk. Concept is derived
// from the nasal grapheme. Run: node scripts/gen-ng.mjs → node scripts/lint-packs.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// Envelope graphemes (== decodability.json PH-ng): blends set + ng + nk. Greedy longest-match
// segmentation here MUST equal the lint's, so the encode tiles are canonical (§13, lint check 8).
const ENV = ['ng', 'nk', 'sh', 'ch', 'th', 'ck', 'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
  'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z', 'a', 'e', 'i', 'o', 'u']
const GS = [...ENV].sort((a, b) => b.length - a.length)
function seg(word) {
  const w = word.toLowerCase(); const out = []; let i = 0
  while (i < w.length) { const g = GS.find(g => w.startsWith(g, i)); if (!g) throw new Error(`undecodable: ${word} @ ${w.slice(i)}`); out.push(g); i += g.length }
  return out
}

// [word, difficulty, [decodeDistractor1, decodeDistractor2]] — distractors real & decodable.
const WORDS = [
  // -ng
  ['ring', 1, ['king', 'wing']], ['king', 1, ['ring', 'sing']], ['sing', 1, ['ring', 'wing']],
  ['wing', 1, ['ring', 'king']], ['bang', 1, ['gang', 'hang']], ['hang', 1, ['bang', 'rang']],
  ['gang', 2, ['bang', 'hang']], ['rang', 2, ['bang', 'sang']], ['sang', 2, ['rang', 'hang']],
  ['song', 1, ['long', 'gong']], ['long', 1, ['song', 'gong']], ['gong', 2, ['song', 'long']],
  ['lung', 2, ['rung', 'hung']], ['rung', 2, ['lung', 'hung']], ['hung', 2, ['lung', 'rung']],
  ['sung', 3, ['rung', 'lung']], ['thing', 2, ['sting', 'swing']], ['bring', 2, ['sting', 'cling']],
  ['sting', 3, ['bring', 'swing']], ['swing', 2, ['sting', 'bring']], ['cling', 3, ['sting', 'bring']],
  ['strong', 3, ['spring', 'string']], ['spring', 3, ['strong', 'string']], ['string', 3, ['spring', 'strong']],
  // -nk
  ['bank', 1, ['tank', 'sank']], ['tank', 1, ['bank', 'rank']], ['sank', 1, ['bank', 'rank']],
  ['pink', 1, ['sink', 'link']], ['sink', 1, ['pink', 'wink']], ['link', 2, ['pink', 'wink']],
  ['wink', 2, ['pink', 'sink']], ['junk', 2, ['sunk', 'bunk']], ['sunk', 2, ['junk', 'bunk']],
  ['bunk', 2, ['junk', 'dunk']], ['dunk', 2, ['sunk', 'bunk']], ['honk', 3, ['bank', 'sink']],
  ['thank', 2, ['blank', 'plank']], ['blank', 2, ['plank', 'crank']], ['plank', 3, ['blank', 'crank']],
  ['drink', 2, ['blink', 'think']], ['think', 2, ['drink', 'blink']], ['blink', 3, ['drink', 'think']],
  ['trunk', 3, ['drunk', 'skunk']], ['drunk', 3, ['trunk', 'skunk']], ['skunk', 3, ['trunk', 'chunk']],
  ['chunk', 3, ['skunk', 'trunk']], ['shrink', 3, ['drink', 'blink']],
]

const conceptOf = g => g.includes('nk') ? 'nasal-nk' : 'nasal-ng'
const POOL = ['ng', 'nk', 'n', 'g', 'k', 'sh', 'ch', 'th', 'ck', 'b', 'd', 'm', 'p', 't', 's', 'r', 'l', 'a', 'e', 'i', 'o', 'u']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, d, dd], i) => {
  const g = seg(w), pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-ng-${num(i)}`, skillId: 'PH-ng', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-ng' }
})
const spell = WORDS.map(([w, d], i) => {
  const g = seg(w)
  return { id: `sp-ng-${num(i)}`, skillId: 'SP-ng', itemType: 'build_word', difficulty: d,
    stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
    distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
    rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-ng' }
})

const phLesson = { 'PH-ng': {
  iCanStatement: 'I can read words that end in ng and nk.',
  explanation: 'Two letters at the end of a word can hum through your nose. ng says /ng/ — ring, song. nk says /ngk/ — bank, think. Each is ONE sound: keep the two letters together and add them after the short vowel.',
  workedExamples: [ { text: 'ring', note: 'r · i · ng → ring' }, { text: 'bank', note: 'b · a · nk → bank' } ]
} }
const spLesson = { 'SP-ng': {
  iCanStatement: 'I can spell words that end in ng and nk.',
  explanation: 'When you hear the humming /ng/ at the end, write ng (song). When you hear /ngk/ — a hum with a little /k/ — write nk (pink). Use the one ng or nk tile, not n + g or n + k.',
  workedExamples: [ { text: 'song', note: 'Hear s-o-ng → tiles s · o · ng' }, { text: 'pink', note: 'Hear p-i-nk → tiles p · i · nk' } ]
} }

writeFileSync(join(dir, 'phonics-L14-ng.json'), JSON.stringify(
  { packId: 'phonics-L14-ng', strand: 'phonics', skillIds: ['PH-ng'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L14-ng.json'), JSON.stringify(
  { packId: 'spelling-L14-ng', strand: 'spelling', skillIds: ['SP-ng'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode ng/nk items.`)
