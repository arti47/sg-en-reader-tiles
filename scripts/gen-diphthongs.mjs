// T09 diphthongs + short-oo generator (§12). SPLIT into two Learn sub-units so a session teaches
// only a few new sounds (owner request): diphthongs-a = oi/oy/ou/ow (the /oy/ and /ow/ sounds),
// diphthongs-b = aw/au (the /aw/ sound) + short oo (book). Each team is a SINGLE grapheme tile.
// Run: node scripts/gen-diphthongs.mjs
import { writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
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
  ['boy', ['b','oy'], 1, ['toy','joy']],
  ['toy', ['t','oy'], 1, ['boy','joy']],
  ['joy', ['j','oy'], 1, ['boy','coy']],
  ['coy', ['c','oy'], 2, ['soy','joy']],
  ['soy', ['s','oy'], 2, ['coy','joy']],
  ['ploy', ['p','l','oy'], 3, ['boy','toy']],
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
  ['haul', ['h','au','l'], 2, ['haunt','fault']],
  ['haunt', ['h','au','n','t'], 3, ['taunt','haul']],
  ['fault', ['f','au','l','t'], 3, ['vault','haul']],
  ['vault', ['v','au','l','t'], 3, ['fault','haul']],
  ['pause', ['p','au','s','e'], 3, ['cause','sauce']],
  ['cause', ['c','au','s','e'], 3, ['pause','sauce']],
  ['sauce', ['s','au','c','e'], 3, ['pause','cause']],
  ['taunt', ['t','au','n','t'], 3, ['haunt','haul']],
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
]

const DIPH = ['oi','oy','ou','aw','au','ow']
const conceptOf = g => g.includes('oo') ? 'short-oo' : 'diphthong-' + g.find(x => DIPH.includes(x))
const num = i => String(i + 1).padStart(3, '0')
// Group A = /oy/ + /ow/ (oi/oy/ou/ow); Group B = /aw/ (aw/au) + short oo.
const groupOf = g => g.includes('oo') ? 'b' : (['aw','au'].includes(g.find(x => DIPH.includes(x))) ? 'b' : 'a')

const GROUPS = {
  a: { id: 'diphthongs-a', pfx: 'dia', file: 'L09a-diphthongs-a',
    pool: ['oi','oy','ou','ow','ar','or','er','ir','ur','ai','ee','oo','a','e','i','o','u','sh','ch','th','ck','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with oi, oy, ou and ow.',
      explanation: "A diphthong glides from one sound to another. oi/oy say /oy/ (coin, boy — oi in the middle, oy at the end). ou/ow say /ow/ (out, cow). Read the two letters as one gliding sound.",
      workedExamples: [ { text: 'coin', note: 'c · oi · n → coin (oi = /oy/)' }, { text: 'cow', note: 'c · ow → cow (ow = /ow/)' } ] },
    sp: { iCanStatement: 'I can spell words with oi, oy, ou and ow.',
      explanation: "The /oy/ sound is oi in the middle (coin) and oy at the end (boy). The /ow/ sound is ou in the middle (out) and ow at the end (cow). Choose the right team tile.",
      workedExamples: [ { text: 'boy', note: '/oy/ at the end → b · oy' }, { text: 'out', note: '/ow/ in the middle → ou · t' } ] } },
  b: { id: 'diphthongs-b', pfx: 'dib', file: 'L09b-diphthongs-b',
    pool: ['aw','au','oo','oi','oy','ou','ow','ar','or','ai','ee','a','e','i','o','u','sh','ch','th','ck','b','d','l','m','n','r','s','t'],
    ph: { iCanStatement: 'I can read words with aw, au and short oo.',
      explanation: "aw and au say /aw/ (saw, haul). Short oo says /uu/ as in book (a shorter sound than moon). Read the two letters as one sound.",
      workedExamples: [ { text: 'saw', note: 's · aw → saw (aw = /aw/)' }, { text: 'book', note: 'b · oo · k → book (short oo)' } ] },
    sp: { iCanStatement: 'I can spell words with aw, au and short oo.',
      explanation: "The /aw/ sound is aw at the end (saw) or au in the middle (haul). Short oo words like book, look, good use oo. Choose the right team tile.",
      workedExamples: [ { text: 'draw', note: '/aw/ at the end → d · r · aw' }, { text: 'good', note: 'short oo → g · oo · d' } ] } }
}

for (const f of ['phonics-L09-diphthongs.json', 'spelling-L09-diphthongs.json']) {
  try { rmSync(join(dir, f)) } catch { /* already gone */ }
}

for (const [key, g] of Object.entries(GROUPS)) {
  const words = WORDS.filter(([, gr]) => groupOf(gr) === key)
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
