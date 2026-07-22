// T07 vowel teams generator (§12). SPLIT into two sub-units so a Learn unit introduces only a
// few new sounds at a time (owner request — "too many sounds at one go"): teams-a = ai/ay/ee/ea
// (long a + long e), teams-b = oa/ow/oo/ew/ue/igh (long o, oo, and more). Each team is a SINGLE
// grapheme tile. Only the long-vowel senses are used. Run: node scripts/gen-vowel-teams.mjs
import { writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  ['rain', ['r','ai','n'], 1, ['main','pain']],
  ['main', ['m','ai','n'], 1, ['rain','pain']],
  ['pain', ['p','ai','n'], 2, ['rain','main']],
  ['wait', ['w','ai','t'], 1, ['tail','sail']],
  ['tail', ['t','ai','l'], 1, ['nail','sail']],
  ['nail', ['n','ai','l'], 2, ['tail','sail']],
  ['sail', ['s','ai','l'], 2, ['tail','nail']],
  ['rail', ['r','ai','l'], 2, ['tail','nail']],
  ['play', ['p','l','ay'], 1, ['stay','clay']],
  ['stay', ['s','t','ay'], 1, ['play','day']],
  ['day', ['d','ay'], 1, ['way','say']],
  ['way', ['w','ay'], 1, ['day','say']],
  ['say', ['s','ay'], 2, ['day','way']],
  ['tray', ['t','r','ay'], 2, ['clay','play']],
  ['clay', ['c','l','ay'], 2, ['tray','play']],
  ['spray', ['s','p','r','ay'], 3, ['tray','clay']],
  ['feet', ['f','ee','t'], 1, ['feed','seed']],
  ['feed', ['f','ee','d'], 1, ['seed','need']],
  ['seed', ['s','ee','d'], 1, ['feed','need']],
  ['need', ['n','ee','d'], 2, ['seed','feed']],
  ['keep', ['k','ee','p'], 2, ['deep','feet']],
  ['deep', ['d','ee','p'], 2, ['keep','feet']],
  ['tree', ['t','r','ee'], 2, ['feet','green']],
  ['green', ['g','r','ee','n'], 3, ['tree','feet']],
  ['leaf', ['l','ea','f'], 1, ['bean','read']],
  ['bean', ['b','ea','n'], 1, ['read','seat']],
  ['read', ['r','ea','d'], 2, ['bean','seat']],
  ['seat', ['s','ea','t'], 2, ['meat','beat']],
  ['meat', ['m','ea','t'], 2, ['seat','beat']],
  ['team', ['t','ea','m'], 2, ['meat','seat']],
  ['heat', ['h','ea','t'], 3, ['meat','beat']],
  ['beat', ['b','ea','t'], 3, ['heat','seat']],
  ['boat', ['b','oa','t'], 1, ['coat','goat']],
  ['coat', ['c','oa','t'], 1, ['boat','goat']],
  ['goat', ['g','oa','t'], 2, ['boat','coat']],
  ['road', ['r','oa','d'], 1, ['load','soap']],
  ['load', ['l','oa','d'], 2, ['road','soap']],
  ['soap', ['s','oa','p'], 2, ['road','coal']],
  ['coal', ['c','oa','l'], 3, ['goal','soap']],
  ['goal', ['g','oa','l'], 3, ['coal','soap']],
  ['snow', ['s','n','ow'], 1, ['slow','grow']],
  ['slow', ['s','l','ow'], 1, ['snow','grow']],
  ['grow', ['g','r','ow'], 2, ['slow','blow']],
  ['blow', ['b','l','ow'], 2, ['glow','grow']],
  ['glow', ['g','l','ow'], 2, ['blow','show']],
  ['show', ['sh','ow'], 2, ['flow','glow']],
  ['flow', ['f','l','ow'], 3, ['show','blow']],
  ['crow', ['c','r','ow'], 3, ['grow','snow']],
  ['moon', ['m','oo','n'], 1, ['soon','food']],
  ['soon', ['s','oo','n'], 1, ['moon','food']],
  ['food', ['f','oo','d'], 2, ['room','moon']],
  ['room', ['r','oo','m'], 2, ['food','boot']],
  ['boot', ['b','oo','t'], 2, ['root','food']],
  ['root', ['r','oo','t'], 3, ['boot','room']],
  ['cool', ['c','oo','l'], 2, ['food','room']],
  ['spoon', ['s','p','oo','n'], 3, ['moon','soon']],
  ['new', ['n','ew'], 1, ['chew','crew']],
  ['chew', ['ch','ew'], 2, ['new','crew']],
  ['crew', ['c','r','ew'], 2, ['drew','blew']],
  ['drew', ['d','r','ew'], 3, ['crew','blew']],
  ['blew', ['b','l','ew'], 3, ['grew','crew']],
  ['grew', ['g','r','ew'], 3, ['blew','drew']],
  ['blue', ['b','l','ue'], 1, ['glue','true']],
  ['glue', ['g','l','ue'], 2, ['blue','clue']],
  ['true', ['t','r','ue'], 2, ['clue','blue']],
  ['clue', ['c','l','ue'], 3, ['glue','due']],
  ['due', ['d','ue'], 2, ['blue','glue']],
  ['light', ['l','igh','t'], 1, ['night','right']],
  ['night', ['n','igh','t'], 2, ['light','right']],
  ['right', ['r','igh','t'], 2, ['might','light']],
  ['might', ['m','igh','t'], 3, ['right','light']],
  ['high', ['h','igh'], 3, ['night','right']],
]

const TEAMS = ['igh','ai','ay','ee','ea','oa','ow','oo','ew','ue']
const teamOf = g => g.find(x => TEAMS.includes(x))
const conceptOf = g => 'vowel-team-' + teamOf(g)
const num = i => String(i + 1).padStart(3, '0')

const GROUPS = {
  a: {
    teams: ['ai','ay','ee','ea'], id: 'vowel-teams-a', pfx: 'vta',
    pool: ['ai','ay','ee','ea','sh','ch','th','ck','a','e','i','o','u','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with the ai, ay, ee and ea teams.',
      explanation: "A vowel team is two letters that make ONE long vowel. ai and ay say long a (rain, play — ai in the middle, ay at the end). ee and ea say long e (feet, leaf). Read the team as one sound.",
      workedExamples: [ { text: 'rain', note: 'r · ai · n → rain (ai = long a)' }, { text: 'feet', note: 'f · ee · t → feet (ee = long e)' } ] },
    sp: { iCanStatement: 'I can spell words with the ai, ay, ee and ea teams.',
      explanation: "For long a, use ai in the middle (rain) and ay at the end (play). For long e, use ee (feet) or ea (leaf). Pick the right team tile for the sound.",
      workedExamples: [ { text: 'play', note: 'Long a at the end → p · l · ay' }, { text: 'leaf', note: 'Long e → l · ea · f' } ] }
  },
  b: {
    teams: ['oa','ow','oo','ew','ue','igh'], id: 'vowel-teams-b', pfx: 'vtb',
    pool: ['oa','ow','oo','ew','ue','igh','ai','ay','ee','ea','sh','ch','th','ck','a','e','i','o','u','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with the oa, ow, oo, ew, ue and igh teams.',
      explanation: "More vowel teams: oa and ow say long o (boat, snow). oo says /oo/ (moon). ew and ue say /oo/ too (new, blue). igh says long i (light). Read the team as one sound.",
      workedExamples: [ { text: 'boat', note: 'b · oa · t → boat (oa = long o)' }, { text: 'light', note: 'l · igh · t → light (igh = long i)' } ] },
    sp: { iCanStatement: 'I can spell words with the oa, ow, oo, ew, ue and igh teams.',
      explanation: "For long o, use oa in the middle (boat) or ow at the end (snow). /oo/ is usually oo (moon); at the end it can be ew (new) or ue (blue). Long i in these words is igh (light).",
      workedExamples: [ { text: 'boat', note: 'Long o in the middle → b · oa · t' }, { text: 'snow', note: 'Long o at the end → s · n · ow' } ] }
  }
}

// remove the old single-pack files (skills no longer exist → would fail lint)
for (const f of ['phonics-L07-vowel-teams.json', 'spelling-L07-vowel-teams.json']) {
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
  writeFileSync(join(dir, `phonics-L07${g.pfx.slice(-1)}-${g.id}.json`), JSON.stringify(
    { packId: `phonics-L07${g.pfx.slice(-1)}-${g.id}`, strand: 'phonics', skillIds: [`PH-${g.id}`], version: 1, items: decode, lessons: { [`PH-${g.id}`]: g.ph } }, null, 2) + '\n')
  writeFileSync(join(dir, `spelling-L07${g.pfx.slice(-1)}-${g.id}.json`), JSON.stringify(
    { packId: `spelling-L07${g.pfx.slice(-1)}-${g.id}`, strand: 'spelling', skillIds: [`SP-${g.id}`], version: 1, items: spell, lessons: { [`SP-${g.id}`]: g.sp } }, null, 2) + '\n')
  console.log(`Wrote ${decode.length} decode + ${spell.length} encode for ${g.id}.`)
}
