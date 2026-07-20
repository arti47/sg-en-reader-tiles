// T06 silent-e / magic-e generator (§12 pipeline). Emits phonics-L06-silent-e.json
// + spelling-L06-silent-e.json. Split-digraph a_e/i_e/o_e/u_e: a final silent 'e'
// makes the vowel long (cap→cape). Tiles are individual letters incl. the silent
// e. Best decode distractors are the short-vowel counterparts (cap/cape, kit/kite,
// hop/hope). Concept derived from the long vowel. Run: node scripts/gen-silent-e.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes(letters incl. silent e), difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // a_e
  ['cake', ['c','a','k','e'], 1, ['lake','bake']],
  ['lake', ['l','a','k','e'], 1, ['cake','make']],
  ['make', ['m','a','k','e'], 1, ['take','bake']],
  ['take', ['t','a','k','e'], 2, ['make','lake']],
  ['bake', ['b','a','k','e'], 2, ['cake','take']],
  ['name', ['n','a','m','e'], 1, ['game','same']],
  ['game', ['g','a','m','e'], 1, ['name','same']],
  ['gate', ['g','a','t','e'], 1, ['late','date']],
  ['late', ['l','a','t','e'], 2, ['gate','date']],
  ['cape', ['c','a','p','e'], 2, ['cap','tape']],
  ['tape', ['t','a','p','e'], 2, ['tap','cape']],
  ['hate', ['h','a','t','e'], 2, ['hat','gate']],
  ['snake', ['s','n','a','k','e'], 3, ['shake','shape']],
  ['shake', ['sh','a','k','e'], 3, ['snake','shape']],
  ['grape', ['g','r','a','p','e'], 3, ['grade','brave']],
  ['plane', ['p','l','a','n','e'], 3, ['plate','place']],
  // i_e
  ['bike', ['b','i','k','e'], 1, ['like','hike']],
  ['like', ['l','i','k','e'], 1, ['bike','hike']],
  ['hike', ['h','i','k','e'], 2, ['bike','like']],
  ['bite', ['b','i','t','e'], 1, ['bit','kite']],
  ['kite', ['k','i','t','e'], 1, ['kit','bite']],
  ['time', ['t','i','m','e'], 1, ['lime','dime']],
  ['lime', ['l','i','m','e'], 2, ['time','dime']],
  ['dine', ['d','i','n','e'], 2, ['din','line']],
  ['line', ['l','i','n','e'], 1, ['mine','nine']],
  ['mine', ['m','i','n','e'], 1, ['nine','line']],
  ['nine', ['n','i','n','e'], 2, ['mine','line']],
  ['pine', ['p','i','n','e'], 2, ['pin','fine']],
  ['fine', ['f','i','n','e'], 2, ['fin','pine']],
  ['ride', ['r','i','d','e'], 1, ['rid','side']],
  ['side', ['s','i','d','e'], 2, ['ride','wide']],
  ['ripe', ['r','i','p','e'], 2, ['rip','wipe']],
  // o_e
  ['bone', ['b','o','n','e'], 1, ['cone','tone']],
  ['cone', ['c','o','n','e'], 1, ['bone','tone']],
  ['tone', ['t','o','n','e'], 2, ['bone','cone']],
  ['note', ['n','o','t','e'], 1, ['not','vote']],
  ['vote', ['v','o','t','e'], 2, ['note','dote']],
  ['rope', ['r','o','p','e'], 1, ['hope','cope']],
  ['hope', ['h','o','p','e'], 1, ['hop','rope']],
  ['cope', ['c','o','p','e'], 2, ['cop','rope']],
  ['nose', ['n','o','s','e'], 1, ['rose','hose']],
  ['rose', ['r','o','s','e'], 1, ['nose','hose']],
  ['hose', ['h','o','s','e'], 2, ['nose','rose']],
  ['pose', ['p','o','s','e'], 2, ['nose','rose']],
  ['robe', ['r','o','b','e'], 2, ['rob','rope']],
  ['code', ['c','o','d','e'], 2, ['cod','mode']],
  ['hole', ['h','o','l','e'], 2, ['mole','pole']],
  ['mole', ['m','o','l','e'], 2, ['hole','pole']],
  // u_e
  ['cube', ['c','u','b','e'], 1, ['cub','tube']],
  ['tube', ['t','u','b','e'], 1, ['tub','cube']],
  ['cute', ['c','u','t','e'], 1, ['cut','mute']],
  ['mute', ['m','u','t','e'], 2, ['cute','mule']],
  ['dune', ['d','u','n','e'], 2, ['tune','rude']],
  ['tune', ['t','u','n','e'], 2, ['dune','rude']],
  ['rude', ['r','u','d','e'], 2, ['rule','dude']],
  ['rule', ['r','u','l','e'], 2, ['rude','mule']],
  ['mule', ['m','u','l','e'], 2, ['rule','mute']],
  ['fume', ['f','u','m','e'], 3, ['fuse','cube']],
  ['fuse', ['f','u','s','e'], 3, ['fume','use']],
  ['use', ['u','s','e'], 2, ['fuse','fume']],
  ['duke', ['d','u','k','e'], 3, ['dude','cube']],
  ['jute', ['j','u','t','e'], 2, ['cute','mute']],
  ['flute', ['f','l','u','t','e'], 3, ['brute','prune']],
  ['prune', ['p','r','u','n','e'], 3, ['flute','brute']],
]

const conceptOf = g => 'silent-e-' + g.slice(0, -1).find(x => x.length === 1 && 'aeiou'.includes(x))
const POOL = ['a','e','i','o','u','sh','ch','th','ck','b','d','g','k','l','m','n','p','r','s','t','v']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-se-${num(i)}`, skillId: 'PH-silent-e', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${w} — the silent e makes the vowel say its name.`, decodableWithin: 'PH-silent-e' }
})
const spell = WORDS.map(([w, g, d], i) => ({
  id: `sp-se-${num(i)}`, skillId: 'SP-silent-e', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
  rationale: `${w} = ${g.join('-')} (don't forget the magic e).`, decodableWithin: 'SP-silent-e' }))

const phLesson = { 'PH-silent-e': {
  iCanStatement: 'I can read words with a bossy silent e.',
  explanation: "A silent 'e' at the end is bossy: it jumps back over one consonant and makes the vowel say its NAME (long sound). cap → cape, kit → kite, hop → hope, cub → cube. You don't say the e itself.",
  workedExamples: [ { text: 'cape', note: 'cap (short a) + magic e → cape (long a, /ay/)' }, { text: 'hope', note: 'hop (short o) + magic e → hope (long o)' } ]
} }
const spLesson = { 'SP-silent-e': {
  iCanStatement: 'I can spell words with a bossy silent e.',
  explanation: "To spell a long-vowel word, build the sounds then add the silent 'e' tile at the end to make the vowel long: c-a-k + e → cake. Without the e it would be 'cak'.",
  workedExamples: [ { text: 'bike', note: 'Hear b-i-k, long i → tiles b · i · k · e' }, { text: 'tube', note: 'Hear t-u-b, long u → tiles t · u · b · e' } ]
} }

writeFileSync(join(dir, 'phonics-L06-silent-e.json'), JSON.stringify(
  { packId: 'phonics-L06-silent-e', strand: 'phonics', skillIds: ['PH-silent-e'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L06-silent-e.json'), JSON.stringify(
  { packId: 'spelling-L06-silent-e', strand: 'spelling', skillIds: ['SP-silent-e'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode silent-e items.`)
