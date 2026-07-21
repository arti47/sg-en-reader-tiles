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

// [word, difficulty, [distractor1, distractor2], heart?] — distractors are confusable sight/short
// words; `heart` names the IRREGULAR part to learn by heart (§5 heart-word method — decode the
// regular letters, memorise only the tricky grapheme), omitted where the whole word is regular.
const WORDS = [
  ['the', 1, ['she', 'he'], 'e (says /uh/)'],
  ['was', 1, ['saw', 'way'], 'a (says /o/)'],
  ['of', 1, ['off', 'for'], 'f (says /v/)'],
  ['to', 1, ['too', 'do'], 'o (says /oo/)'],
  ['do', 1, ['to', 'go'], 'o (says /oo/)'],
  ['you', 1, ['your', 'our'], 'ou'],
  ['your', 2, ['you', 'our'], 'our'],
  ['are', 1, ['our', 'oar'], 're'],
  ['they', 2, ['them', 'then'], 'ey (says /ay/)'],
  ['their', 3, ['there', 'they'], 'ei'],
  ['there', 2, ['their', 'where'], 'ere'],
  ['where', 2, ['there', 'were'], 'wh'],
  ['were', 2, ['where', 'here'], 'ere'],
  ['here', 1, ['hear', 'were'], 'ere'],
  ['one', 1, ['once', 'on'], 'o (says /w/)'],
  ['once', 2, ['one', 'ones'], 'o (says /w/)'],
  ['come', 1, ['some', 'came'], 'o (says /u/)'],
  ['some', 2, ['come', 'same'], 'o (says /u/)'],
  ['could', 2, ['would', 'should'], 'l (silent)'],
  ['would', 2, ['could', 'should'], 'l (silent)'],
  ['should', 3, ['could', 'would'], 'l (silent)'],
  ['who', 2, ['how', 'why'], 'wh (says /h/)'],
  ['what', 1, ['that', 'want'], 'wh'],
  ['want', 2, ['what', 'went'], 'a (says /o/)'],
  ['said', 1, ['says', 'sad'], 'ai (says /e/)'],
  ['because', 3, ['became', 'become'], 'au'],
  ['people', 3, ['purple', 'pebble'], 'eo'],
  ['friend', 3, ['friends', 'fried'], 'ie (says /e/)'],
  ['school', 2, ['cool', 'spool'], 'ch (says /k/)'],
  ['been', 1, ['bean', 'bin']],
  ['does', 2, ['goes', 'dose'], 'oe (says /u/)'],
  ['done', 2, ['gone', 'dome'], 'o (says /u/)'],
  ['give', 1, ['gave', 'live'], 'i (short)'],
  ['have', 1, ['gave', 'hive'], 'a (short)'],
  ['live', 2, ['love', 'life'], 'i (short)'],
  ['love', 2, ['live', 'dove'], 'o (says /u/)'],
  ['put', 1, ['pat', 'pit'], 'u (says /oo/)'],
  ['pull', 2, ['full', 'bull'], 'u (says /oo/)'],
  ['full', 2, ['pull', 'bull'], 'u (says /oo/)'],
  ['push', 2, ['bush', 'gush'], 'u (says /oo/)'],
  ['sure', 3, ['cure', 'pure'], 'su (says /sh/)'],
  ['two', 1, ['too', 'tow'], 'w (silent)'],
  ['four', 2, ['for', 'fort'], 'ou'],
  ['any', 1, ['many', 'and'], 'a (says /e/)'],
  ['many', 2, ['any', 'man'], 'a (says /e/)'],
  ['again', 3, ['against', 'gain'], 'ai (says /e/)'],
  ['great', 3, ['greet', 'treat'], 'ea (says /ay/)'],
  ['buy', 2, ['bye', 'boy'], 'uy (says /y/)'],
  ['busy', 3, ['bury', 'bus'], 'u (says /i/)'],
  ['build', 3, ['built', 'bird'], 'ui (says /i/)'],
  ['work', 2, ['word', 'world'], 'or (says /er/)'],
  ['word', 2, ['work', 'world'], 'or (says /er/)'],
  ['world', 3, ['word', 'work'], 'or (says /er/)'],
  ['learn', 3, ['earn', 'lean'], 'ear (says /er/)'],
  ['eye', 2, ['eyes', 'aye'], 'eye shape'],
]

const num = i => String(i + 1).padStart(3, '0')
const items = WORDS.map(([w, d, dd, heart], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-hf-${num(i)}`, skillId: 'HF-words', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    ...(heart ? { heart } : {}),
    missedConceptOnFail: 'sight-word', rationale: `"${w}" is a tricky word we learn by heart.`, decodableWithin: 'HF-words' }
})
const lessons = { 'HF-words': {
  iCanStatement: 'I can read tricky high-frequency words, remembering just the heart part.',
  explanation: "Some words don't fully follow the rules, but MOST of the letters still do. These are 'heart words': sound out the regular letters as usual, and learn only the one tricky part 'by heart'. In said, the 's' and 'd' behave — only 'ai' is tricky (it says /e/). In come, 'c-m' behave — only the 'o' is tricky (it says /u/). Knowing these fast makes reading much smoother.",
  workedExamples: [ { text: 'said', note: "s + ai + d — only 'ai' is the heart part (it says /e/)." }, { text: 'come', note: "c + o + m + e — the heart part is 'o', which says /u/." } ]
} }

writeFileSync(join(dir, 'phonics-L12-hf.json'), JSON.stringify(
  { packId: 'phonics-L12-hf', strand: 'phonics', skillIds: ['HF-words'], version: 1, items, lessons }, null, 2) + '\n')

const hfList = [...new Set(WORDS.flatMap(([w, , dd]) => [w, ...dd]))].sort()
console.log(`Wrote ${items.length} HF items.`)
console.log('HF-words highFrequency list (paste into decodability.json):')
console.log(JSON.stringify(hfList))
