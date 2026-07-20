// T04 blends authoring generator (§12 pipeline). Emits phonics-L04-blends.json
// + spelling-L04-blends.json from the WORDS table. A blend = two adjacent
// single-consonant graphemes (each its own tile), so words are CCVC / CVCC /
// CCVCC. Run: node scripts/gen-blends.mjs  → then lint:packs.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, 'i'nitial|'f'inal blend, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // initial blends
  ['black', ['b','l','a','ck'], 1, 'i', ['block','brick']],
  ['block', ['b','l','o','ck'], 2, 'i', ['black','clock']],
  ['clap', ['c','l','a','p'], 1, 'i', ['clip','flap']],
  ['clip', ['c','l','i','p'], 1, 'i', ['clap','slip']],
  ['flag', ['f','l','a','g'], 1, 'i', ['flap','flog']],
  ['flap', ['f','l','a','p'], 1, 'i', ['flag','slap']],
  ['frog', ['f','r','o','g'], 2, 'i', ['from','drop']],
  ['drum', ['d','r','u','m'], 2, 'i', ['drop','dram']],
  ['drop', ['d','r','o','p'], 1, 'i', ['drip','prop']],
  ['grab', ['g','r','a','b'], 2, 'i', ['grub','crab']],
  ['grin', ['g','r','i','n'], 2, 'i', ['grid','grip']],
  ['crab', ['c','r','a','b'], 1, 'i', ['grab','crib']],
  ['club', ['c','l','u','b'], 1, 'i', ['clap','clam']],
  ['clam', ['c','l','a','m'], 2, 'i', ['club','slam']],
  ['plan', ['p','l','a','n'], 1, 'i', ['plum','clan']],
  ['plum', ['p','l','u','m'], 1, 'i', ['plan','plug']],
  ['slam', ['s','l','a','m'], 2, 'i', ['slim','clam']],
  ['slip', ['s','l','i','p'], 1, 'i', ['slap','clip']],
  ['snap', ['s','n','a','p'], 1, 'i', ['snip','slap']],
  ['spin', ['s','p','i','n'], 2, 'i', ['span','spun']],
  ['spot', ['s','p','o','t'], 1, 'i', ['spit','slot']],
  ['stop', ['s','t','o','p'], 1, 'i', ['step','shop']],
  ['step', ['s','t','e','p'], 1, 'i', ['stop','stem']],
  ['swim', ['s','w','i','m'], 2, 'i', ['swam','slim']],
  ['trap', ['t','r','a','p'], 1, 'i', ['trip','tram']],
  ['trip', ['t','r','i','p'], 2, 'i', ['trap','drip']],
  ['skip', ['s','k','i','p'], 2, 'i', ['skid','slip']],
  ['skin', ['s','k','i','n'], 2, 'i', ['skid','spin']],
  ['twig', ['t','w','i','g'], 2, 'i', ['twin','twit']],
  ['twin', ['t','w','i','n'], 2, 'i', ['twig','twit']],
  // final blends
  ['hand', ['h','a','n','d'], 1, 'f', ['band','sand']],
  ['band', ['b','a','n','d'], 1, 'f', ['hand','bond']],
  ['sand', ['s','a','n','d'], 1, 'f', ['send','band']],
  ['land', ['l','a','n','d'], 1, 'f', ['lend','hand']],
  ['bend', ['b','e','n','d'], 2, 'f', ['band','bond']],
  ['send', ['s','e','n','d'], 2, 'f', ['sand','sent']],
  ['pond', ['p','o','n','d'], 2, 'f', ['bond','fond']],
  ['tent', ['t','e','n','t'], 1, 'f', ['tint','dent']],
  ['dent', ['d','e','n','t'], 2, 'f', ['tent','rent']],
  ['hunt', ['h','u','n','t'], 2, 'f', ['hint','bunt']],
  ['lamp', ['l','a','m','p'], 1, 'f', ['limp','lump']],
  ['camp', ['c','a','m','p'], 1, 'f', ['lamp','damp']],
  ['jump', ['j','u','m','p'], 1, 'f', ['bump','dump']],
  ['bump', ['b','u','m','p'], 2, 'f', ['jump','lump']],
  ['nest', ['n','e','s','t'], 1, 'f', ['best','rest']],
  ['best', ['b','e','s','t'], 1, 'f', ['bust','rest']],
  ['rest', ['r','e','s','t'], 2, 'f', ['rust','test']],
  ['fist', ['f','i','s','t'], 2, 'f', ['fast','mist']],
  ['list', ['l','i','s','t'], 2, 'f', ['last','lost']],
  ['dust', ['d','u','s','t'], 2, 'f', ['must','mist']],
  ['mask', ['m','a','s','k'], 2, 'f', ['task','musk']],
  ['desk', ['d','e','s','k'], 1, 'f', ['disk','dusk']],
  ['milk', ['m','i','l','k'], 2, 'f', ['silk','sulk']],
  ['belt', ['b','e','l','t'], 2, 'f', ['melt','felt']],
  ['melt', ['m','e','l','t'], 2, 'f', ['belt','felt']],
  ['gift', ['g','i','f','t'], 1, 'f', ['lift','sift']],
  ['lift', ['l','i','f','t'], 2, 'f', ['left','soft']],
  ['soft', ['s','o','f','t'], 2, 'f', ['gift','loft']],
  ['bank', ['b','a','n','k'], 2, 'f', ['sank','bunk']],
  ['sink', ['s','i','n','k'], 3, 'f', ['sank','sunk']],
  // CCVCC and mixed blend+digraph (difficulty 3)
  ['stand', ['s','t','a','n','d'], 3, 'f', ['brand','stamp']],
  ['stamp', ['s','t','a','m','p'], 3, 'f', ['clamp','stump']],
  ['crush', ['c','r','u','sh'], 3, 'i', ['brush','crash']],
  ['brush', ['b','r','u','sh'], 3, 'i', ['crush','brash']],
  ['crash', ['c','r','a','sh'], 3, 'i', ['crush','trash']],
  ['trust', ['t','r','u','s','t'], 3, 'f', ['crust','twist']],
  ['blend', ['b','l','e','n','d'], 3, 'f', ['bland','brand']],
  ['drink', ['d','r','i','n','k'], 3, 'i', ['drank','drunk']],
  ['frost', ['f','r','o','s','t'], 3, 'f', ['crust','cost']],
  ['twist', ['t','w','i','s','t'], 3, 'i', ['trust','twin']],
]

// Auto encode distractor tiles: confusable graphemes not already in the word,
// count scaled by difficulty (d+1). Vowels + consonants + digraphs.
const POOL = ['sh','ch','th','ck','s','t','n','d','m','p','b','g','l','r','k','f','a','e','i','o','u']
const encodeDistractors = (graphemes, d) =>
  POOL.filter(g => !graphemes.includes(g)).slice(0, d + 1)

const concept = c => (c === 'i' ? 'blend-initial' : 'blend-final')
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, c, dd], i) => {
  const labels = [w, dd[0], dd[1]]
  const correctPos = i % 3
  // place correct at correctPos, distractors in the others
  const others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === correctPos ? w : others[p < correctPos ? p : p - 1] }))
  return {
    id: `ph-bl-${num(i)}`, skillId: 'PH-blends', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices,
    correctChoiceId: 'abc'[correctPos], missedConceptOnFail: concept(c),
    rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-blends'
  }
})

const spell = WORDS.map(([w, g, d, c], i) => ({
  id: `sp-bl-${num(i)}`, skillId: 'SP-blends', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: concept(c),
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-blends'
}))

const phLesson = { 'PH-blends': {
  iCanStatement: 'I can read words with consonant blends.',
  explanation: 'When two consonants sit side by side, blend their sounds together smoothly — say BOTH. s-t-o-p → stop. Blends can be at the start (stop, clap) or the end (hand, jump).',
  workedExamples: [ { text: 'stop', note: 's /s/ · t /t/ · o /o/ · p /p/ → stop' }, { text: 'hand', note: 'h · a · n · d → hand (hear the n AND the d)' } ]
} }
const spLesson = { 'SP-blends': {
  iCanStatement: 'I can spell words with consonant blends.',
  explanation: 'A blend has TWO consonant sounds next to each other — do not miss either one. stop needs s AND t; hand needs n AND d. Say the word slowly and place a tile for every sound.',
  workedExamples: [ { text: 'clap', note: 'Hear c-l-a-p → tiles c · l · a · p' }, { text: 'jump', note: 'Hear j-u-m-p → tiles j · u · m · p' } ]
} }

writeFileSync(join(dir, 'phonics-L04-blends.json'), JSON.stringify(
  { packId: 'phonics-L04-blends', strand: 'phonics', skillIds: ['PH-blends'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L04-blends.json'), JSON.stringify(
  { packId: 'spelling-L04-blends', strand: 'spelling', skillIds: ['SP-blends'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode blend items.`)
