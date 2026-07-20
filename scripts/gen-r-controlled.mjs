// T08 r-controlled vowels generator (§12 pipeline). Emits
// phonics-L08-r-controlled.json + spelling-L08-r-controlled.json. A "bossy r"
// changes the vowel: ar/or/er/ir/ur — each a SINGLE grapheme tile (car→c·ar,
// bird→b·ir·d, church→ch·ur·ch). er/ir/ur all say /er/, so spelling choice is the
// hard part. Concept derived from the r-team. Run: node scripts/gen-r-controlled.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // ar
  ['car', ['c','ar'], 1, ['bar','jar']],
  ['bar', ['b','ar'], 1, ['car','jar']],
  ['jar', ['j','ar'], 1, ['car','tar']],
  ['tar', ['t','ar'], 2, ['far','car']],
  ['far', ['f','ar'], 1, ['car','bar']],
  ['star', ['s','t','ar'], 2, ['car','park']],
  ['arm', ['ar','m'], 1, ['art','farm']],
  ['art', ['ar','t'], 2, ['arm','cart']],
  ['card', ['c','ar','d'], 1, ['hard','bark']],
  ['hard', ['h','ar','d'], 2, ['card','park']],
  ['park', ['p','ar','k'], 1, ['dark','bark']],
  ['dark', ['d','ar','k'], 2, ['park','bark']],
  ['bark', ['b','ar','k'], 2, ['dark','mark']],
  ['mark', ['m','ar','k'], 2, ['bark','park']],
  ['shark', ['sh','ar','k'], 3, ['sharp','spark']],
  ['sharp', ['sh','ar','p'], 3, ['shark','cart']],
  ['cart', ['c','ar','t'], 2, ['card','dart']],
  ['farm', ['f','ar','m'], 2, ['arm','harm']],
  // or
  ['for', ['f','or'], 1, ['fort','sort']],
  ['fork', ['f','or','k'], 1, ['cork','born']],
  ['cork', ['c','or','k'], 2, ['fork','corn']],
  ['born', ['b','or','n'], 1, ['corn','horn']],
  ['corn', ['c','or','n'], 2, ['born','horn']],
  ['horn', ['h','or','n'], 2, ['born','corn']],
  ['torn', ['t','or','n'], 2, ['born','corn']],
  ['sort', ['s','or','t'], 2, ['port','fort']],
  ['port', ['p','or','t'], 2, ['sort','fort']],
  ['fort', ['f','or','t'], 1, ['port','sort']],
  ['sport', ['s','p','or','t'], 3, ['short','storm']],
  ['short', ['sh','or','t'], 2, ['sport','storm']],
  ['storm', ['s','t','or','m'], 3, ['short','sport']],
  ['north', ['n','or','th'], 3, ['storm','short']],
  ['horse', ['h','or','s','e'], 3, ['born','corn']],
  ['torch', ['t','or','ch'], 3, ['north','short']],
  // er
  ['her', ['h','er'], 1, ['herd','term']],
  ['herd', ['h','er','d'], 2, ['her','term']],
  ['term', ['t','er','m'], 2, ['fern','germ']],
  ['fern', ['f','er','n'], 2, ['term','germ']],
  ['verb', ['v','er','b'], 2, ['term','herb']],
  ['germ', ['g','er','m'], 3, ['term','fern']],
  ['perch', ['p','er','ch'], 3, ['clerk','jerk']],
  ['clerk', ['c','l','er','k'], 3, ['jerk','perch']],
  ['jerk', ['j','er','k'], 2, ['clerk','perch']],
  ['stern', ['s','t','er','n'], 3, ['fern','term']],
  ['perk', ['p','er','k'], 2, ['jerk','clerk']],
  ['herb', ['h','er','b'], 2, ['verb','term']],
  // ir
  ['bird', ['b','ir','d'], 1, ['girl','dirt']],
  ['girl', ['g','ir','l'], 1, ['bird','dirt']],
  ['sir', ['s','ir'], 1, ['stir','fir']],
  ['stir', ['s','t','ir'], 2, ['sir','dirt']],
  ['dirt', ['d','ir','t'], 2, ['bird','firm']],
  ['firm', ['f','ir','m'], 2, ['first','dirt']],
  ['first', ['f','ir','s','t'], 3, ['firm','shirt']],
  ['shirt', ['sh','ir','t'], 2, ['skirt','first']],
  ['skirt', ['s','k','ir','t'], 3, ['shirt','first']],
  ['third', ['th','ir','d'], 2, ['bird','girl']],
  ['birth', ['b','ir','th'], 3, ['third','firm']],
  ['chirp', ['ch','ir','p'], 3, ['shirt','skirt']],
  ['swirl', ['s','w','ir','l'], 3, ['girl','twirl']],
  ['thirst', ['th','ir','s','t'], 3, ['first','shirt']],
  // ur
  ['fur', ['f','ur'], 1, ['cur','burn']],
  ['burn', ['b','ur','n'], 1, ['turn','curl']],
  ['turn', ['t','ur','n'], 2, ['burn','curl']],
  ['curl', ['c','ur','l'], 2, ['burn','turn']],
  ['hurt', ['h','ur','t'], 2, ['curl','surf']],
  ['surf', ['s','ur','f'], 2, ['turf','curb']],
  ['curb', ['c','ur','b'], 3, ['turf','surf']],
  ['turf', ['t','ur','f'], 3, ['surf','curb']],
  ['blur', ['b','l','ur'], 2, ['spur','fur']],
  ['spur', ['s','p','ur'], 3, ['blur','fur']],
  ['churn', ['ch','ur','n'], 3, ['burn','turn']],
  ['burst', ['b','ur','s','t'], 3, ['hurt','curl']],
  ['nurse', ['n','ur','s','e'], 3, ['purse','curl']],
  ['purse', ['p','ur','s','e'], 3, ['nurse','curb']],
]

const TEAMS = ['ar','or','er','ir','ur']
const conceptOf = g => 'r-controlled-' + g.find(x => TEAMS.includes(x))
const POOL = ['ar','or','er','ir','ur','ai','ee','oo','a','e','i','o','u','sh','ch','th','ck','b','d','l','m','n','r','s','t']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-rc-${num(i)}`, skillId: 'PH-r-controlled', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-r-controlled' }
})
const spell = WORDS.map(([w, g, d], i) => ({
  id: `sp-rc-${num(i)}`, skillId: 'SP-r-controlled', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-r-controlled' }))

const phLesson = { 'PH-r-controlled': {
  iCanStatement: 'I can read words with a bossy r (ar, or, er, ir, ur).',
  explanation: "When 'r' follows a vowel, it bosses the vowel into a new sound. ar says /ar/ (car), or says /or/ (fork). er, ir and ur all say the SAME sound, /er/ (her, bird, turn). Read the vowel and the r together as one chunk.",
  workedExamples: [ { text: 'car', note: 'c · ar → car (ar = /ar/)' }, { text: 'bird', note: 'b · ir · d → bird (ir = /er/)' } ]
} }
const spLesson = { 'SP-r-controlled': {
  iCanStatement: 'I can spell words with a bossy r.',
  explanation: "For /ar/ use ar (car); for /or/ use or (fork). The /er/ sound is tricky — it can be er, ir or ur. Learn each word: her, bird, turn. Pick the r-team tile, don't split it into two.",
  workedExamples: [ { text: 'park', note: 'Hear p-ar-k → tiles p · ar · k' }, { text: 'turn', note: 'Hear t-ur-n → tiles t · ur · n' } ]
} }

writeFileSync(join(dir, 'phonics-L08-r-controlled.json'), JSON.stringify(
  { packId: 'phonics-L08-r-controlled', strand: 'phonics', skillIds: ['PH-r-controlled'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L08-r-controlled.json'), JSON.stringify(
  { packId: 'spelling-L08-r-controlled', strand: 'spelling', skillIds: ['SP-r-controlled'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode r-controlled items.`)
