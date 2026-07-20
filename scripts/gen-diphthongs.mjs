// T09 diphthongs + short-oo generator (§12 pipeline). Emits
// phonics-L09-diphthongs.json + spelling-L09-diphthongs.json. Gliding vowels:
// oi/oy (coin, boy), ou/ow (out, cow — the /ow/ sound, NOT long-o snow), aw/au
// (saw, haul), plus short oo (book). Each team is a SINGLE grapheme tile. ow and
// oo reuse the existing tiles (different sound, this pack's sense). Concept
// derived from the team. Run: node scripts/gen-diphthongs.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // oi
  ['oil', ['oi','l'], 1, ['coin','boil']],
  ['coin', ['c','oi','n'], 1, ['join','boil']],
  ['boil', ['b','oi','l'], 2, ['soil','coil']],
  ['soil', ['s','oi','l'], 2, ['boil','coil']],
  ['join', ['j','oi','n'], 2, ['coin','joint']],
  ['coil', ['c','oi','l'], 2, ['boil','foil']],
  ['foil', ['f','oi','l'], 2, ['boil','soil']],
  ['point', ['p','oi','n','t'], 3, ['joint','coin']],
  ['joint', ['j','oi','n','t'], 3, ['point','coin']],
  ['spoil', ['s','p','oi','l'], 3, ['boil','soil']],
  // oy
  ['boy', ['b','oy'], 1, ['toy','joy']],
  ['toy', ['t','oy'], 1, ['boy','joy']],
  ['joy', ['j','oy'], 1, ['boy','coy']],
  ['coy', ['c','oy'], 2, ['soy','joy']],
  ['soy', ['s','oy'], 2, ['coy','joy']],
  ['ploy', ['p','l','oy'], 3, ['boy','toy']],
  // ou
  ['out', ['ou','t'], 1, ['loud','shout']],
  ['loud', ['l','ou','d'], 1, ['cloud','proud']],
  ['cloud', ['c','l','ou','d'], 2, ['loud','proud']],
  ['proud', ['p','r','ou','d'], 3, ['loud','cloud']],
  ['round', ['r','ou','n','d'], 2, ['sound','found']],
  ['sound', ['s','ou','n','d'], 2, ['round','found']],
  ['found', ['f','ou','n','d'], 2, ['round','pound']],
  ['pound', ['p','ou','n','d'], 3, ['round','sound']],
  ['ground', ['g','r','ou','n','d'], 3, ['round','sound']],
  ['count', ['c','ou','n','t'], 3, ['found','round']],
  ['mouth', ['m','ou','th'], 2, ['south','shout']],
  ['south', ['s','ou','th'], 2, ['mouth','shout']],
  ['shout', ['sh','ou','t'], 2, ['scout','out']],
  ['scout', ['s','c','ou','t'], 3, ['shout','out']],
  // ow (diphthong)
  ['cow', ['c','ow'], 1, ['how','now']],
  ['how', ['h','ow'], 1, ['cow','now']],
  ['now', ['n','ow'], 1, ['cow','how']],
  ['owl', ['ow','l'], 2, ['down','town']],
  ['down', ['d','ow','n'], 1, ['town','gown']],
  ['town', ['t','ow','n'], 2, ['down','gown']],
  ['gown', ['g','ow','n'], 2, ['down','town']],
  ['brown', ['b','r','ow','n'], 3, ['crown','clown']],
  ['crown', ['c','r','ow','n'], 3, ['brown','clown']],
  ['clown', ['c','l','ow','n'], 3, ['brown','frown']],
  ['frown', ['f','r','ow','n'], 3, ['clown','crown']],
  ['growl', ['g','r','ow','l'], 3, ['brown','crown']],
  // aw
  ['saw', ['s','aw'], 1, ['jaw','law']],
  ['jaw', ['j','aw'], 1, ['saw','law']],
  ['law', ['l','aw'], 1, ['saw','paw']],
  ['paw', ['p','aw'], 2, ['raw','jaw']],
  ['raw', ['r','aw'], 2, ['paw','law']],
  ['claw', ['c','l','aw'], 2, ['draw','straw']],
  ['draw', ['d','r','aw'], 2, ['claw','straw']],
  ['straw', ['s','t','r','aw'], 3, ['draw','claw']],
  ['yawn', ['y','aw','n'], 2, ['dawn','lawn']],
  ['dawn', ['d','aw','n'], 2, ['yawn','lawn']],
  ['lawn', ['l','aw','n'], 3, ['dawn','yawn']],
  ['crawl', ['c','r','aw','l'], 3, ['claw','draw']],
  // au
  ['haul', ['h','au','l'], 2, ['haunt','fault']],
  ['haunt', ['h','au','n','t'], 3, ['taunt','haul']],
  ['fault', ['f','au','l','t'], 3, ['vault','haul']],
  ['vault', ['v','au','l','t'], 3, ['fault','haul']],
  ['pause', ['p','au','s','e'], 3, ['cause','sauce']],
  ['cause', ['c','au','s','e'], 3, ['pause','sauce']],
  ['sauce', ['s','au','c','e'], 3, ['pause','cause']],
  ['taunt', ['t','au','n','t'], 3, ['haunt','haul']],
  // short oo
  ['book', ['b','oo','k'], 1, ['look','took']],
  ['look', ['l','oo','k'], 1, ['book','took']],
  ['took', ['t','oo','k'], 2, ['book','look']],
  ['cook', ['c','oo','k'], 1, ['hook','book']],
  ['hook', ['h','oo','k'], 2, ['cook','book']],
  ['good', ['g','oo','d'], 1, ['hood','wood']],
  ['hood', ['h','oo','d'], 2, ['wood','good']],
  ['wood', ['w','oo','d'], 2, ['good','hood']],
  ['foot', ['f','oo','t'], 2, ['book','wood']],
  ['wool', ['w','oo','l'], 3, ['good','wood']],
  ['stood', ['s','t','oo','d'], 3, ['good','wood']],
  ['shook', ['sh','oo','k'], 3, ['book','cook']],
  ['brook', ['b','r','oo','k'], 3, ['crook','book']],
  ['crook', ['c','r','oo','k'], 3, ['brook','book']],
]

const DIPH = ['oi','oy','ou','aw','au','ow']
const conceptOf = g => g.includes('oo') ? 'short-oo' : 'diphthong-' + g.find(x => DIPH.includes(x))
const POOL = ['oi','oy','ou','ow','aw','au','oo','ee','ai','a','e','i','o','u','sh','ch','th','ck','b','d','l','m','n','r','s','t']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-di-${num(i)}`, skillId: 'PH-diphthongs', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-diphthongs' }
})
const spell = WORDS.map(([w, g, d], i) => ({
  id: `sp-di-${num(i)}`, skillId: 'SP-diphthongs', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-diphthongs' }))

const phLesson = { 'PH-diphthongs': {
  iCanStatement: 'I can read words with oi, oy, ou, ow, aw, au and short oo.',
  explanation: "A diphthong is a vowel sound that GLIDES from one sound to another. oi/oy say /oy/ (coin, boy), ou/ow say /ow/ (out, cow), aw/au say /aw/ (saw, haul). Short oo says /uu/ as in book. Read the two letters as one gliding sound.",
  workedExamples: [ { text: 'coin', note: 'c · oi · n → coin (oi = /oy/)' }, { text: 'cow', note: 'c · ow → cow (ow = /ow/)' } ]
} }
const spLesson = { 'SP-diphthongs': {
  iCanStatement: 'I can spell words with oi, oy, ou, ow, aw, au and short oo.',
  explanation: "The /oy/ sound is usually oi in the middle (coin) and oy at the end (boy). The /ow/ sound is usually ou in the middle (out) and ow at the end (cow). The /aw/ sound is aw (saw) or au (haul). Choose the right team tile.",
  workedExamples: [ { text: 'boy', note: 'Hear b-oy, /oy/ at the end → b · oy' }, { text: 'out', note: 'Hear ou-t, /ow/ in the middle → ou · t' } ]
} }

writeFileSync(join(dir, 'phonics-L09-diphthongs.json'), JSON.stringify(
  { packId: 'phonics-L09-diphthongs', strand: 'phonics', skillIds: ['PH-diphthongs'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L09-diphthongs.json'), JSON.stringify(
  { packId: 'spelling-L09-diphthongs', strand: 'spelling', skillIds: ['SP-diphthongs'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode diphthong items.`)
