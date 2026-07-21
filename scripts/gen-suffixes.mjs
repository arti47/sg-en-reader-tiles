// T11b inflectional-suffix generator (§12 pipeline). Emits phonics-L11-suffixes.json +
// spelling-L11-suffixes.json — the morphology rung above two-syllable (§5). Adds -s, -ing and
// -ed with the three PSLE spelling rules: just-add (jump→jumped), double the final consonant
// (hop→hopped), and drop the silent e (hope→hoping). A -y base changes to -i (cry→cried).
// Suffix letters decompose into already-taught tiles (no new graphemes), so the envelope equals
// the two-syllable one. Tiles stay the canonical greedy chunking (ck/sh/pp/nn… single tiles).
// Run: node scripts/gen-suffixes.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, rule('a'dd|'d'ouble|'e' drop-e|'y' change-y), [dist1, dist2]]
const WORDS = [
  // just add (base ends in 2 consonants / a digraph — no change)
  ['jumps', ['j','u','m','p','s'], 1, 'a', ['helps','jumped']],
  ['jumping', ['j','u','m','p','i','n','g'], 2, 'a', ['helping','jumped']],
  ['jumped', ['j','u','m','p','e','d'], 2, 'a', ['helped','jumping']],
  ['helps', ['h','e','l','p','s'], 1, 'a', ['jumps','helped']],
  ['helping', ['h','e','l','p','i','n','g'], 2, 'a', ['jumping','helped']],
  ['helped', ['h','e','l','p','e','d'], 2, 'a', ['jumped','helping']],
  ['picks', ['p','i','ck','s'], 1, 'a', ['licks','picked']],
  ['picking', ['p','i','ck','i','n','g'], 2, 'a', ['kicking','picked']],
  ['picked', ['p','i','ck','e','d'], 2, 'a', ['kicked','picking']],
  ['wished', ['w','i','sh','e','d'], 2, 'a', ['fished','wishing']],
  ['wishing', ['w','i','sh','i','n','g'], 2, 'a', ['fishing','wished']],
  ['fishing', ['f','i','sh','i','n','g'], 2, 'a', ['wishing','fished']],
  ['hunted', ['h','u','n','t','e','d'], 2, 'a', ['hunting','hunts']],
  ['hunting', ['h','u','n','t','i','n','g'], 2, 'a', ['hunted','hunts']],
  ['boxes', ['b','o','x','e','s'], 2, 'a', ['foxes','boxed']],
  ['melted', ['m','e','l','t','e','d'], 2, 'a', ['melting','melts']],
  // double the final consonant (short-vowel CVC base)
  ['hops', ['h','o','p','s'], 1, 'd', ['hopped','hopping']],
  ['hopping', ['h','o','pp','i','n','g'], 2, 'd', ['hopped','hops']],
  ['hopped', ['h','o','pp','e','d'], 2, 'd', ['hopping','hops']],
  ['running', ['r','u','nn','i','n','g'], 2, 'd', ['runs','rubbing']],
  ['stopped', ['s','t','o','pp','e','d'], 3, 'd', ['stopping','stops']],
  ['stopping', ['s','t','o','pp','i','n','g'], 3, 'd', ['stopped','stops']],
  ['sitting', ['s','i','tt','i','n','g'], 2, 'd', ['sits','sipping']],
  ['hugged', ['h','u','gg','e','d'], 3, 'd', ['hugging','hugs']],
  ['shopping', ['sh','o','pp','i','n','g'], 3, 'd', ['shopped','shops']],
  ['bedding', ['b','e','dd','i','n','g'], 3, 'd', ['begging','beds']],
  ['tapped', ['t','a','pp','e','d'], 2, 'd', ['tapping','taps']],
  // drop the silent e (magic-e base)
  ['hoping', ['h','o','p','i','n','g'], 3, 'e', ['hoped','hopes']],
  ['hoped', ['h','o','p','e','d'], 2, 'e', ['hoping','hopes']],
  ['baking', ['b','a','k','i','n','g'], 3, 'e', ['baked','bakes']],
  ['baked', ['b','a','k','e','d'], 2, 'e', ['baking','bakes']],
  ['riding', ['r','i','d','i','n','g'], 3, 'e', ['rides','hiding']],
  ['making', ['m','a','k','i','n','g'], 2, 'e', ['makes','baking']],
  ['used', ['u','s','e','d'], 2, 'e', ['using','uses']],
  ['smiled', ['s','m','i','l','e','d'], 3, 'e', ['smiling','smiles']],
  ['shining', ['sh','i','n','i','n','g'], 3, 'e', ['shined','shines']],
  // change y → i
  ['cried', ['c','r','i','e','d'], 3, 'y', ['tried','cries']],
  ['tried', ['t','r','i','e','d'], 3, 'y', ['cried','tries']],
  ['dried', ['d','r','i','e','d'], 3, 'y', ['fried','dries']],
  ['fried', ['f','r','i','e','d'], 3, 'y', ['dried','fries']],
  ['spied', ['s','p','i','e','d'], 3, 'y', ['tried','spies']],
]

const CONCEPT = { a: 'suffix-add', d: 'suffix-double', e: 'suffix-drop-e', y: 'suffix-change-y' }
const POOL = ['bb','tt','nn','pp','dd','gg','ck','sh','ch','th','a','e','i','o','u','b','d','g','k','l','m','n','p','r','s','t','x']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, , d, ty, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-sf-${num(i)}`, skillId: 'PH-suffixes', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: CONCEPT[ty], rationale: `${w} — read the base word, then the ending.`, decodableWithin: 'PH-suffixes' }
})
const spell = WORDS.map(([w, g, d, ty], i) => ({
  id: `sp-sf-${num(i)}`, skillId: 'SP-suffixes', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: CONCEPT[ty],
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-suffixes' }))

const phLesson = { 'PH-suffixes': {
  iCanStatement: 'I can read words with -s, -ing and -ed endings.',
  explanation: "Long words often have a base word plus an ending: jump + ed = jumped, help + ing = helping. To read them, find the base word first, then read the ending. -ed can sound like /d/ (played), /t/ (jumped) or /id/ (hunted) — all spelt e-d. Read the chunk you know, then add the ending.",
  workedExamples: [ { text: 'jumped', note: 'jump + ed → jumped' }, { text: 'helping', note: 'help + ing → helping' } ]
} }
const spLesson = { 'SP-suffixes': {
  iCanStatement: 'I can add -s, -ing and -ed using the spelling rules.',
  explanation: "Three rules for adding -ing or -ed. 1) Just add it when the base ends in two consonants: jump → jumped. 2) DOUBLE the last letter after one short vowel: hop → hopping, run → running. 3) DROP the silent e before the ending: hope → hoping, bake → baked. A base ending in y changes to i: cry → cried.",
  workedExamples: [ { text: 'hopping', note: 'hop + p + ing — double the p (short o)' }, { text: 'hoping', note: 'hope − e + ing — drop the e (long o)' }, { text: 'cried', note: 'cry → i + ed → cried' } ]
} }

writeFileSync(join(dir, 'phonics-L11-suffixes.json'), JSON.stringify(
  { packId: 'phonics-L11-suffixes', strand: 'phonics', skillIds: ['PH-suffixes'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L11-suffixes.json'), JSON.stringify(
  { packId: 'spelling-L11-suffixes', strand: 'spelling', skillIds: ['SP-suffixes'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode suffix items.`)
