// T21 r-vowel-teams generator (§19.13.5). Emits phonics-L15-r-vowel-teams.json +
// spelling-L15-r-vowel-teams.json. The r-influenced vowel trigraphs ear (hear), air
// (hair), ure (cure) — each a SINGLE grapheme tile. Words stay decodable within the
// r-controlled envelope + these three trigraphs. Concept derived from the trigraph.
// Run: node scripts/gen-r-vowel-teams.mjs → node scripts/lint-packs.mjs
import { writeFileSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dataDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const dir = join(dataDir, 'packs')

// Envelope == decodability.json PH-r-vowel-teams (r-controlled set + ear/air/ure). Greedy
// longest-match must equal the lint's so encode tiles are canonical (§13, lint check 8).
const rc = JSON.parse(readFileSync(join(dataDir, 'decodability.json'), 'utf8'))['PH-r-controlled'].graphemes
const ENV = ['ear', 'air', 'ure', ...rc]
const GS = [...new Set(ENV)].sort((a, b) => b.length - a.length)
function seg(word) {
  const w = word.toLowerCase(); const out = []; let i = 0
  while (i < w.length) { const g = GS.find(g => w.startsWith(g, i)); if (!g) throw new Error(`undecodable: ${word} @ ${w.slice(i)}`); out.push(g); i += g.length }
  return out
}

// [word, difficulty, [decodeDistractor1, decodeDistractor2]] — distractors real & decodable.
const WORDS = [
  // ear /ear/
  ['hear', 1, ['near', 'fear']], ['near', 1, ['hear', 'dear']], ['dear', 1, ['hear', 'year']],
  ['fear', 1, ['near', 'gear']], ['gear', 2, ['year', 'rear']], ['year', 1, ['hear', 'near']],
  ['rear', 2, ['gear', 'fear']], ['tear', 2, ['year', 'dear']], ['clear', 2, ['spear', 'smear']],
  ['spear', 3, ['clear', 'smear']], ['smear', 3, ['clear', 'spear']], ['beard', 3, ['clear', 'spear']],
  // air /air/
  ['hair', 1, ['fair', 'pair']], ['fair', 1, ['hair', 'pair']], ['pair', 1, ['hair', 'lair']],
  ['lair', 2, ['fair', 'pair']], ['chair', 2, ['stair', 'flair']], ['stair', 2, ['chair', 'flair']],
  ['flair', 3, ['chair', 'stair']],
  // ure /ure/
  ['cure', 1, ['pure', 'sure']], ['pure', 2, ['cure', 'lure']], ['sure', 2, ['cure', 'pure']],
  ['lure', 3, ['cure', 'pure']],
]

const conceptOf = g => g.includes('air') ? 'r-vowel-team-air' : g.includes('ure') ? 'r-vowel-team-ure' : 'r-vowel-team-ear'
const POOL = ['ear', 'air', 'ure', 'ar', 'or', 'er', 'ir', 'ur', 'ee', 'ea', 'ai', 'b', 'c', 'd', 'f', 'h', 'l', 'p', 's', 't', 'r', 'n']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, d, dd], i) => {
  const g = seg(w), pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-rvt-${num(i)}`, skillId: 'PH-r-vowel-teams', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-r-vowel-teams' }
})
const spell = WORDS.map(([w, d], i) => {
  const g = seg(w)
  return { id: `sp-rvt-${num(i)}`, skillId: 'SP-r-vowel-teams', itemType: 'build_word', difficulty: d,
    stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
    distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
    rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-r-vowel-teams' }
})

const phLesson = { 'PH-r-vowel-teams': {
  iCanStatement: 'I can read words with ear, air and ure.',
  explanation: 'Three letters together can make one r-vowel sound. ear says /eer/ — hear, near. air says /air/ — hair, chair. ure says /yoor/ — cure, pure. Keep the three letters together as one chunk.',
  workedExamples: [ { text: 'hear', note: 'h · ear → hear' }, { text: 'chair', note: 'ch · air → chair' } ]
} }
const spLesson = { 'SP-r-vowel-teams': {
  iCanStatement: 'I can spell words with ear, air and ure.',
  explanation: 'For the /eer/ sound at the end, write ear (hear). For /air/, write air (hair). For /yoor/, write ure (cure). Use the one ear, air or ure tile.',
  workedExamples: [ { text: 'near', note: 'Hear n-ear → tiles n · ear' }, { text: 'cure', note: 'Hear c-ure → tiles c · ure' } ]
} }

writeFileSync(join(dir, 'phonics-L15-r-vowel-teams.json'), JSON.stringify(
  { packId: 'phonics-L15-r-vowel-teams', strand: 'phonics', skillIds: ['PH-r-vowel-teams'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L15-r-vowel-teams.json'), JSON.stringify(
  { packId: 'spelling-L15-r-vowel-teams', strand: 'spelling', skillIds: ['SP-r-vowel-teams'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode r-vowel-team items.`)
