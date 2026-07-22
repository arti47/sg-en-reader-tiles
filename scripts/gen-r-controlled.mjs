// T08 r-controlled vowels generator (§12). SPLIT into two Learn sub-units so a session teaches
// only a few new sounds (owner request): r-controlled-a = ar/or, r-controlled-b = er/ir/ur (all
// /er/). Each r-team is a SINGLE grapheme tile. Run: node scripts/gen-r-controlled.mjs
import { writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
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
const teamOf = g => g.find(x => TEAMS.includes(x))
const conceptOf = g => 'r-controlled-' + teamOf(g)
const num = i => String(i + 1).padStart(3, '0')

const GROUPS = {
  a: { teams: ['ar','or'], id: 'r-controlled-a', pfx: 'rca', file: 'L08a-r-controlled-a',
    pool: ['ar','or','ai','ay','ee','ea','oa','ow','oo','ew','ue','igh','sh','ch','th','ck','a','e','i','o','u','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with ar and or (bossy r).',
      explanation: "When 'r' follows a vowel it bosses it into a new sound. ar says /ar/ (car, park). or says /or/ (fork, corn). Read the vowel and the r together as one chunk.",
      workedExamples: [ { text: 'car', note: 'c · ar → car (ar = /ar/)' }, { text: 'fork', note: 'f · or · k → fork (or = /or/)' } ] },
    sp: { iCanStatement: 'I can spell words with ar and or.',
      explanation: "For the /ar/ sound use ar (car, park). For the /or/ sound use or (fork, corn). Pick the r-team tile — don't split it into two letters.",
      workedExamples: [ { text: 'park', note: 'Hear p-ar-k → p · ar · k' }, { text: 'corn', note: 'Hear c-or-n → c · or · n' } ] } },
  b: { teams: ['er','ir','ur'], id: 'r-controlled-b', pfx: 'rcb', file: 'L08b-r-controlled-b',
    pool: ['er','ir','ur','ar','or','ai','ee','oo','a','e','i','o','u','sh','ch','th','ck','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with er, ir and ur (bossy r).',
      explanation: "er, ir and ur ALL say the same sound, /er/ — her, bird, turn. Read the vowel and the r together as one chunk; the tricky part is which spelling each word uses.",
      workedExamples: [ { text: 'bird', note: 'b · ir · d → bird (ir = /er/)' }, { text: 'turn', note: 't · ur · n → turn (ur = /er/)' } ] },
    sp: { iCanStatement: 'I can spell words with er, ir and ur.',
      explanation: "The /er/ sound can be er, ir or ur — you learn each word: her, bird, turn. Pick the right r-team tile; don't split it.",
      workedExamples: [ { text: 'her', note: 'Hear h-er → h · er' }, { text: 'turn', note: 'Hear t-ur-n → t · ur · n' } ] } }
}

for (const f of ['phonics-L08-r-controlled.json', 'spelling-L08-r-controlled.json']) {
  try { rmSync(join(dir, f)) } catch { /* already gone */ }
}

for (const g of Object.values(GROUPS)) {
  const words = WORDS.filter(([, gr]) => g.teams.includes(teamOf(gr)))
  const encodeDistractors = (gr, d) => g.pool.filter(x => !gr.includes(x)).slice(0, d + 1)
  const decode = words.map(([w, gr, d, dd], i) => {
    const pos = i % 3, others = [dd[0], dd[1]]
    const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
    return { id: `ph-${g.pfx}-${num(i)}`, skillId: `PH-${g.id}`, itemType: 'decode_choice', difficulty: d,
      stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
      missedConceptOnFail: conceptOf(gr), rationale: `${gr.join('-')} = ${w}.`, decodableWithin: `PH-${g.id}` }
  })
  const spell = words.map(([w, gr, d], i) => ({
    id: `sp-${g.pfx}-${num(i)}`, skillId: `SP-${g.id}`, itemType: 'build_word', difficulty: d,
    stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: gr,
    distractorGraphemes: encodeDistractors(gr, d), missedConceptOnFail: conceptOf(gr),
    rationale: `${w} = ${gr.join('-')}.`, decodableWithin: `SP-${g.id}` }))
  writeFileSync(join(dir, `phonics-${g.file}.json`), JSON.stringify(
    { packId: `phonics-${g.file}`, strand: 'phonics', skillIds: [`PH-${g.id}`], version: 1, items: decode, lessons: { [`PH-${g.id}`]: g.ph } }, null, 2) + '\n')
  writeFileSync(join(dir, `spelling-${g.file}.json`), JSON.stringify(
    { packId: `spelling-${g.file}`, strand: 'spelling', skillIds: [`SP-${g.id}`], version: 1, items: spell, lessons: { [`SP-${g.id}`]: g.sp } }, null, 2) + '\n')
  console.log(`Wrote ${decode.length} decode + ${spell.length} encode for ${g.id}.`)
}
