// T12 high-frequency ("tricky"/sight) words generator (§12 pipeline). Emits
// phonics-L12-hf.json. These words are NOT fully decodable, so they use the §6a
// highFrequency escape hatch — every word AND distractor must be listed under
// "HF-words" in decodability.json. Item type: decode_choice recognition (hear the
// word → tap it among confusable sight words). Prints the unique HF list to paste
// into decodability.json. Run: node scripts/gen-hf.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, difficulty, [distractor1, distractor2]] — distractors are confusable sight/short words
const WORDS = [
  ['the', 1, ['she', 'he']],
  ['was', 1, ['saw', 'way']],
  ['of', 1, ['off', 'for']],
  ['to', 1, ['too', 'do']],
  ['do', 1, ['to', 'go']],
  ['you', 1, ['your', 'our']],
  ['your', 2, ['you', 'our']],
  ['are', 1, ['our', 'oar']],
  ['they', 2, ['them', 'then']],
  ['their', 3, ['there', 'they']],
  ['there', 2, ['their', 'where']],
  ['where', 2, ['there', 'were']],
  ['were', 2, ['where', 'here']],
  ['here', 1, ['hear', 'were']],
  ['one', 1, ['once', 'on']],
  ['once', 2, ['one', 'ones']],
  ['come', 1, ['some', 'came']],
  ['some', 2, ['come', 'same']],
  ['could', 2, ['would', 'should']],
  ['would', 2, ['could', 'should']],
  ['should', 3, ['could', 'would']],
  ['who', 2, ['how', 'why']],
  ['what', 1, ['that', 'want']],
  ['want', 2, ['what', 'went']],
  ['said', 1, ['says', 'sad']],
  ['because', 3, ['became', 'become']],
  ['people', 3, ['purple', 'pebble']],
  ['friend', 3, ['friends', 'fried']],
  ['school', 2, ['cool', 'spool']],
  ['been', 1, ['bean', 'bin']],
  ['does', 2, ['goes', 'dose']],
  ['done', 2, ['gone', 'dome']],
  ['give', 1, ['gave', 'live']],
  ['have', 1, ['gave', 'hive']],
  ['live', 2, ['love', 'life']],
  ['love', 2, ['live', 'dove']],
  ['put', 1, ['pat', 'pit']],
  ['pull', 2, ['full', 'bull']],
  ['full', 2, ['pull', 'bull']],
  ['push', 2, ['bush', 'gush']],
  ['sure', 3, ['cure', 'pure']],
  ['two', 1, ['too', 'tow']],
  ['four', 2, ['for', 'fort']],
  ['any', 1, ['many', 'and']],
  ['many', 2, ['any', 'man']],
  ['again', 3, ['against', 'gain']],
  ['great', 3, ['greet', 'treat']],
  ['buy', 2, ['bye', 'boy']],
  ['busy', 3, ['bury', 'bus']],
  ['build', 3, ['built', 'bird']],
  ['work', 2, ['word', 'world']],
  ['word', 2, ['work', 'world']],
  ['world', 3, ['word', 'work']],
  ['learn', 3, ['earn', 'lean']],
  ['eye', 2, ['eyes', 'aye']],
]

const num = i => String(i + 1).padStart(3, '0')
const items = WORDS.map(([w, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-hf-${num(i)}`, skillId: 'HF-words', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: 'sight-word', rationale: `"${w}" is a tricky word we learn by heart.`, decodableWithin: 'HF-words' }
})
const lessons = { 'HF-words': {
  iCanStatement: 'I can read tricky high-frequency words by heart.',
  explanation: "Some words don't follow the usual rules, so we can't always sound them out — we learn them by sight. Words like the, was, said, you, come and one turn up all the time, so knowing them by heart makes reading much faster. Look at the whole word and remember its shape.",
  workedExamples: [ { text: 'said', note: 'Looks like it should be "sed" — but we just remember: said.' }, { text: 'one', note: 'Sounds like "wun" — a tricky word to know by heart.' } ]
} }

writeFileSync(join(dir, 'phonics-L12-hf.json'), JSON.stringify(
  { packId: 'phonics-L12-hf', strand: 'phonics', skillIds: ['HF-words'], version: 1, items, lessons }, null, 2) + '\n')

const hfList = [...new Set(WORDS.flatMap(([w, , dd]) => [w, ...dd]))].sort()
console.log(`Wrote ${items.length} HF items.`)
console.log('HF-words highFrequency list (paste into decodability.json):')
console.log(JSON.stringify(hfList))
