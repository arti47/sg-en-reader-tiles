// T07 vowel teams generator (§12 pipeline). Emits phonics-L07-vowel-teams.json
// + spelling-L07-vowel-teams.json. Two letters making one long vowel — each team
// is a SINGLE grapheme tile (rain→r·ai·n, feet→f·ee·t, light→l·igh·t). Only the
// long-vowel senses are used (ow = snow not cow; ea = leaf not bread; oo = moon
// not book). Concept derived from the team. Run: node scripts/gen-vowel-teams.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // ai
  ['rain', ['r','ai','n'], 1, ['main','pain']],
  ['main', ['m','ai','n'], 1, ['rain','pain']],
  ['pain', ['p','ai','n'], 2, ['rain','main']],
  ['wait', ['w','ai','t'], 1, ['tail','sail']],
  ['tail', ['t','ai','l'], 1, ['nail','sail']],
  ['nail', ['n','ai','l'], 2, ['tail','sail']],
  ['sail', ['s','ai','l'], 2, ['tail','nail']],
  ['rail', ['r','ai','l'], 2, ['tail','nail']],
  // ay
  ['play', ['p','l','ay'], 1, ['stay','clay']],
  ['stay', ['s','t','ay'], 1, ['play','day']],
  ['day', ['d','ay'], 1, ['way','say']],
  ['way', ['w','ay'], 1, ['day','say']],
  ['say', ['s','ay'], 2, ['day','way']],
  ['tray', ['t','r','ay'], 2, ['clay','play']],
  ['clay', ['c','l','ay'], 2, ['tray','play']],
  ['spray', ['s','p','r','ay'], 3, ['tray','clay']],
  // ee
  ['feet', ['f','ee','t'], 1, ['feed','seed']],
  ['feed', ['f','ee','d'], 1, ['seed','need']],
  ['seed', ['s','ee','d'], 1, ['feed','need']],
  ['need', ['n','ee','d'], 2, ['seed','feed']],
  ['keep', ['k','ee','p'], 2, ['deep','feet']],
  ['deep', ['d','ee','p'], 2, ['keep','feet']],
  ['tree', ['t','r','ee'], 2, ['feet','green']],
  ['green', ['g','r','ee','n'], 3, ['tree','feet']],
  // ea
  ['leaf', ['l','ea','f'], 1, ['bean','read']],
  ['bean', ['b','ea','n'], 1, ['read','seat']],
  ['read', ['r','ea','d'], 2, ['bean','seat']],
  ['seat', ['s','ea','t'], 2, ['meat','beat']],
  ['meat', ['m','ea','t'], 2, ['seat','beat']],
  ['team', ['t','ea','m'], 2, ['meat','seat']],
  ['heat', ['h','ea','t'], 3, ['meat','beat']],
  ['beat', ['b','ea','t'], 3, ['heat','seat']],
  // oa
  ['boat', ['b','oa','t'], 1, ['coat','goat']],
  ['coat', ['c','oa','t'], 1, ['boat','goat']],
  ['goat', ['g','oa','t'], 2, ['boat','coat']],
  ['road', ['r','oa','d'], 1, ['load','soap']],
  ['load', ['l','oa','d'], 2, ['road','soap']],
  ['soap', ['s','oa','p'], 2, ['road','coal']],
  ['coal', ['c','oa','l'], 3, ['goal','soap']],
  ['goal', ['g','oa','l'], 3, ['coal','soap']],
  // ow (long o)
  ['snow', ['s','n','ow'], 1, ['slow','grow']],
  ['slow', ['s','l','ow'], 1, ['snow','grow']],
  ['grow', ['g','r','ow'], 2, ['slow','blow']],
  ['blow', ['b','l','ow'], 2, ['glow','grow']],
  ['glow', ['g','l','ow'], 2, ['blow','show']],
  ['show', ['sh','ow'], 2, ['flow','glow']],
  ['flow', ['f','l','ow'], 3, ['show','blow']],
  ['crow', ['c','r','ow'], 3, ['grow','snow']],
  // oo (long)
  ['moon', ['m','oo','n'], 1, ['soon','food']],
  ['soon', ['s','oo','n'], 1, ['moon','food']],
  ['food', ['f','oo','d'], 2, ['room','moon']],
  ['room', ['r','oo','m'], 2, ['food','boot']],
  ['boot', ['b','oo','t'], 2, ['root','food']],
  ['root', ['r','oo','t'], 3, ['boot','room']],
  ['cool', ['c','oo','l'], 2, ['food','room']],
  ['spoon', ['s','p','oo','n'], 3, ['moon','soon']],
  // ew
  ['new', ['n','ew'], 1, ['chew','crew']],
  ['chew', ['ch','ew'], 2, ['new','crew']],
  ['crew', ['c','r','ew'], 2, ['drew','blew']],
  ['drew', ['d','r','ew'], 3, ['crew','blew']],
  ['blew', ['b','l','ew'], 3, ['grew','crew']],
  ['grew', ['g','r','ew'], 3, ['blew','drew']],
  // ue
  ['blue', ['b','l','ue'], 1, ['glue','true']],
  ['glue', ['g','l','ue'], 2, ['blue','clue']],
  ['true', ['t','r','ue'], 2, ['clue','blue']],
  ['clue', ['c','l','ue'], 3, ['glue','due']],
  ['due', ['d','ue'], 2, ['blue','glue']],
  // igh
  ['light', ['l','igh','t'], 1, ['night','right']],
  ['night', ['n','igh','t'], 2, ['light','right']],
  ['right', ['r','igh','t'], 2, ['might','light']],
  ['might', ['m','igh','t'], 3, ['right','light']],
  ['high', ['h','igh'], 3, ['night','right']],
]

const TEAMS = ['igh','ai','ay','ee','ea','oa','ow','oo','ew','ue']
const conceptOf = g => 'vowel-team-' + g.find(x => TEAMS.includes(x))
const POOL = ['ai','ay','ee','ea','oa','ow','oo','ew','ue','igh','sh','ch','th','ck','a','e','i','o','u','b','d','l','m','n','r','s','t']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-vt-${num(i)}`, skillId: 'PH-vowel-teams', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-vowel-teams' }
})
const spell = WORDS.map(([w, g, d], i) => ({
  id: `sp-vt-${num(i)}`, skillId: 'SP-vowel-teams', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-vowel-teams' }))

const phLesson = { 'PH-vowel-teams': {
  iCanStatement: 'I can read words where two letters make one long vowel.',
  explanation: "A vowel team is two letters that work together to make ONE long vowel sound. When two vowels go walking, the first often says its name: ai/ay say long a (rain, play), ee/ea say long e (feet, leaf), oa/ow say long o (boat, snow), oo says /oo/ (moon). Read the team as one sound.",
  workedExamples: [ { text: 'rain', note: 'r · ai · n → rain (ai = long a)' }, { text: 'feet', note: 'f · ee · t → feet (ee = long e)' } ]
} }
const spLesson = { 'SP-vowel-teams': {
  iCanStatement: 'I can spell words where two letters make one long vowel.',
  explanation: "For a long-vowel sound, pick the right vowel-team tile. Long a is often ai in the middle (rain) and ay at the end (play). Long e is ee (feet) or ea (leaf). Long o is oa in the middle (boat) or ow at the end (snow).",
  workedExamples: [ { text: 'play', note: 'Hear p-l-ay, long a at the end → p · l · ay' }, { text: 'boat', note: 'Hear b-oa-t, long o in the middle → b · oa · t' } ]
} }

writeFileSync(join(dir, 'phonics-L07-vowel-teams.json'), JSON.stringify(
  { packId: 'phonics-L07-vowel-teams', strand: 'phonics', skillIds: ['PH-vowel-teams'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L07-vowel-teams.json'), JSON.stringify(
  { packId: 'spelling-L07-vowel-teams', strand: 'spelling', skillIds: ['SP-vowel-teams'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode vowel-team items.`)
