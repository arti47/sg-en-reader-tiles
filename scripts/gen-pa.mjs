// Phonemic-awareness generator (§3 audit — the upstream oral skill for weak/dyslexic readers).
// Emits pa-cvc.json: pa_blend (hear separated sounds → pick the blended word) + pa_count (hear a
// word → how many sounds). Audio-only, MCQ, deterministic, no speech input. Served in Learn only
// (LearnRunner) as the FIRST step of the CVC sub-units. Every letter used has a phoneme clip
// (single-letter ids only — no c/x/qu, which have no isolated clip). Run: node scripts/gen-pa.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// pa_blend: [word, distractor1, distractor2] — all CVC, minimal-pair distractors. phonemeSeq = letters.
const BLEND = [
  ['sat', 'sit', 'sap'], ['pin', 'pan', 'pit'], ['tap', 'tip', 'top'], ['nap', 'map', 'nip'],
  ['hen', 'hot', 'hat'], ['red', 'rid', 'bed'], ['dog', 'dig', 'bog'], ['sun', 'sit', 'bun'],
  ['bug', 'big', 'bag'], ['mat', 'met', 'mad'], ['jam', 'jet', 'ham'], ['web', 'wet', 'wig'],
]
// pa_count: [word, phonemeCount] — mix of 2/3/4-sound words (all single-letter phonemes).
const COUNT = [
  ['at', 2], ['up', 2], ['in', 2], ['am', 2], ['on', 2], ['it', 2],
  ['kit', 3], ['sat', 3], ['dog', 3], ['bun', 3], ['red', 3], ['mop', 3],
  ['lamp', 4], ['hand', 4], ['tent', 4], ['milk', 4], ['jump', 4], ['fast', 4],
]

const num = i => String(i + 1).padStart(3, '0')
const items = []

BLEND.forEach(([w, d1, d2], i) => {
  const pos = i % 3, others = [d1, d2]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  items.push({
    id: `pa-bl-${num(i)}`, skillId: 'PA-cvc', itemType: 'pa_blend', difficulty: (i % 2) + 1,
    stem: 'Listen to the sounds. Which word is it?', audioText: w, phonemeSeq: [...w],
    choices, correctChoiceId: 'abc'[pos], missedConceptOnFail: 'phoneme-blend',
    rationale: `${[...w].join('-')} blends to ${w}.`
  })
})
COUNT.forEach(([w, n], i) => {
  const counts = [2, 3, 4]
  const choices = counts.map(c => ({ id: 'abc'[counts.indexOf(c)], label: String(c) }))
  items.push({
    id: `pa-ct-${num(i)}`, skillId: 'PA-cvc', itemType: 'pa_count', difficulty: (i % 2) + 1,
    stem: 'How many sounds do you hear?', audioText: w,
    choices, correctChoiceId: 'abc'[counts.indexOf(n)], missedConceptOnFail: 'phoneme-count',
    rationale: `${w} has ${n} sounds: ${[...w].join('-')}.`
  })
})

const lesson = { 'PA-cvc': {
  iCanStatement: 'I can hear and blend the sounds in a word.',
  explanation: 'Every word is made of small sounds. If you hear the sounds one at a time — /s/ /a/ /t/ — you can blend them together to say the word: sat. You can also count the sounds you hear.',
  workedExamples: [ { text: 'sat', note: '/s/ /a/ /t/ → sat (3 sounds)' }, { text: 'up', note: '/u/ /p/ → up (2 sounds)' } ]
} }

writeFileSync(join(dir, 'pa-cvc.json'), JSON.stringify(
  { packId: 'pa-cvc', strand: 'pa', skillIds: ['PA-cvc'], version: 1, items, lessons: lesson }, null, 2) + '\n')
console.log(`Wrote ${items.length} phonemic-awareness items (${BLEND.length} blend + ${COUNT.length} count).`)
