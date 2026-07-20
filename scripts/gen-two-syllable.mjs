// T10 two-syllable generator (§12 pipeline). Emits phonics-L10-two-syllable.json
// + spelling-L10-two-syllable.json. Three two-syllable types: compound
// (sun+set), closed VCCV (nap|kin — split between the two consonants), and
// medial doubles (rab|bit — the double marks the split). Tiles stay a flat
// grapheme sequence (medial doubles like bb/tt/nn are single tiles). Concept from
// the type column. Run: node scripts/gen-two-syllable.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, type('c'ompound|'v'ccv|'d'ouble), [dist1, dist2]]
const WORDS = [
  // compound
  ['sunset', ['s','u','n','s','e','t'], 1, 'c', ['cobweb','catfish']],
  ['cobweb', ['c','o','b','w','e','b'], 1, 'c', ['sunset','catfish']],
  ['catfish', ['c','a','t','f','i','sh'], 2, 'c', ['sunset','cobweb']],
  ['laptop', ['l','a','p','t','o','p'], 1, 'c', ['sunset','hilltop']],
  ['hilltop', ['h','i','ll','t','o','p'], 2, 'c', ['laptop','sunset']],
  ['bathtub', ['b','a','th','t','u','b'], 2, 'c', ['sandbox','dustbin']],
  ['sandbox', ['s','a','n','d','b','o','x'], 2, 'c', ['bathtub','dustbin']],
  ['popcorn', ['p','o','p','c','or','n'], 2, 'c', ['sunset','cobweb']],
  ['dustbin', ['d','u','s','t','b','i','n'], 2, 'c', ['sandbox','bathtub']],
  ['hotdog', ['h','o','t','d','o','g'], 1, 'c', ['laptop','sunset']],
  ['pigpen', ['p','i','g','p','e','n'], 1, 'c', ['hotdog','sunset']],
  ['backpack', ['b','a','ck','p','a','ck'], 2, 'c', ['laptop','catfish']],
  ['upon', ['u','p','o','n'], 1, 'c', ['into','upset']],
  ['into', ['i','n','t','o'], 1, 'c', ['upon','upset']],
  ['upset', ['u','p','s','e','t'], 1, 'c', ['until','upon']],
  ['until', ['u','n','t','i','l'], 2, 'c', ['upset','upon']],
  ['suntan', ['s','u','n','t','a','n'], 1, 'c', ['sunset','hotdog']],
  ['bobcat', ['b','o','b','c','a','t'], 2, 'c', ['hotdog','catfish']],
  ['gumdrop', ['g','u','m','d','r','o','p'], 2, 'c', ['sunset','laptop']],
  ['cannot', ['c','a','nn','o','t'], 2, 'c', ['upon','into']],
  ['sunlit', ['s','u','n','l','i','t'], 1, 'c', ['suntan','sunset']],
  ['cupcake', ['c','u','p','c','a','k','e'], 3, 'c', ['laptop','catfish']],
  // closed VCCV
  ['napkin', ['n','a','p','k','i','n'], 2, 'v', ['magnet','basket']],
  ['magnet', ['m','a','g','n','e','t'], 2, 'v', ['napkin','helmet']],
  ['basket', ['b','a','s','k','e','t'], 2, 'v', ['napkin','helmet']],
  ['helmet', ['h','e','l','m','e','t'], 2, 'v', ['magnet','velvet']],
  ['insect', ['i','n','s','e','c','t'], 2, 'v', ['contest','velvet']],
  ['picnic', ['p','i','c','n','i','c'], 2, 'v', ['napkin','magnet']],
  ['contest', ['c','o','n','t','e','s','t'], 3, 'v', ['insect','velvet']],
  ['velvet', ['v','e','l','v','e','t'], 3, 'v', ['helmet','magnet']],
  ['goblin', ['g','o','b','l','i','n'], 3, 'v', ['napkin','cactus']],
  ['index', ['i','n','d','e','x'], 2, 'v', ['insect','contest']],
  ['cactus', ['c','a','c','t','u','s'], 3, 'v', ['walnut','campus']],
  ['walnut', ['w','a','l','n','u','t'], 2, 'v', ['cactus','helmet']],
  ['absent', ['a','b','s','e','n','t'], 3, 'v', ['insect','contest']],
  ['dentist', ['d','e','n','t','i','s','t'], 3, 'v', ['insect','contest']],
  ['mascot', ['m','a','s','c','o','t'], 2, 'v', ['cactus','walnut']],
  ['tandem', ['t','a','n','d','e','m'], 3, 'v', ['ransom','velvet']],
  ['ransom', ['r','a','n','s','o','m'], 3, 'v', ['tandem','velvet']],
  ['zigzag', ['z','i','g','z','a','g'], 2, 'v', ['napkin','magnet']],
  ['hectic', ['h','e','c','t','i','c'], 3, 'v', ['picnic','cactus']],
  ['campus', ['c','a','m','p','u','s'], 2, 'v', ['cactus','walnut']],
  ['publish', ['p','u','b','l','i','sh'], 3, 'v', ['punish','finish']],
  ['punish', ['p','u','n','i','sh'], 3, 'v', ['publish','finish']],
  ['finish', ['f','i','n','i','sh'], 2, 'v', ['punish','radish']],
  ['radish', ['r','a','d','i','sh'], 3, 'v', ['finish','punish']],
  // medial doubles
  ['rabbit', ['r','a','bb','i','t'], 2, 'd', ['kitten','mitten']],
  ['kitten', ['k','i','tt','e','n'], 2, 'd', ['rabbit','mitten']],
  ['mitten', ['m','i','tt','e','n'], 2, 'd', ['kitten','rabbit']],
  ['button', ['b','u','tt','o','n'], 2, 'd', ['kitten','ribbon']],
  ['ribbon', ['r','i','bb','o','n'], 3, 'd', ['button','kitten']],
  ['happen', ['h','a','pp','e','n'], 2, 'd', ['rabbit','button']],
  ['puppet', ['p','u','pp','e','t'], 3, 'd', ['rabbit','button']],
  ['muffin', ['m','u','ff','i','n'], 2, 'd', ['rabbit','kitten']],
  ['hidden', ['h','i','dd','e','n'], 3, 'd', ['rabbit','button']],
  ['sudden', ['s','u','dd','e','n'], 3, 'd', ['hidden','button']],
  ['rotten', ['r','o','tt','e','n'], 3, 'd', ['kitten','mitten']],
  ['common', ['c','o','mm','o','n'], 3, 'd', ['button','ribbon']],
  ['dinner', ['d','i','nn','er'], 3, 'd', ['summer','button']],
  ['summer', ['s','u','mm','er'], 3, 'd', ['dinner','button']],
  ['mammoth', ['m','a','mm','o','th'], 3, 'd', ['button','ribbon']],
  ['traffic', ['t','r','a','ff','i','c'], 3, 'd', ['muffin','rabbit']],
  ['tennis', ['t','e','nn','i','s'], 2, 'd', ['rabbit','kitten']],
  ['gossip', ['g','o','ss','i','p'], 3, 'd', ['button','rabbit']],
  ['attic', ['a','tt','i','c'], 2, 'd', ['rabbit','kitten']],
]

const CONCEPT = { c: 'syllable-compound', v: 'syllable-vccv', d: 'syllable-double' }
const POOL = ['bb','tt','nn','pp','dd','mm','ck','sh','ch','th','ll','ss','ff','a','e','i','o','u','b','d','g','k','l','m','n','p','r','s','t']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, ty, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-2s-${num(i)}`, skillId: 'PH-two-syllable', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: CONCEPT[ty], rationale: `${w} — read it in two chunks.`, decodableWithin: 'PH-two-syllable' }
})
const spell = WORDS.map(([w, g, d, ty], i) => ({
  id: `sp-2s-${num(i)}`, skillId: 'SP-two-syllable', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: CONCEPT[ty],
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-two-syllable' }))

const phLesson = { 'PH-two-syllable': {
  iCanStatement: 'I can read two-syllable words by breaking them into chunks.',
  explanation: "Long words are easier in two chunks (syllables). For compound words, split between the two little words: sun|set, cob|web. For other words, split between the two middle consonants: nap|kin, bas|ket. A double letter shows the split too: rab|bit. Read each chunk, then blend them.",
  workedExamples: [ { text: 'sunset', note: 'sun + set → sunset' }, { text: 'napkin', note: 'nap | kin → napkin (split between p and k)' } ]
} }
const spLesson = { 'SP-two-syllable': {
  iCanStatement: 'I can spell two-syllable words chunk by chunk.',
  explanation: "Say the word slowly and spell one chunk at a time: nap … kin → napkin. In many words the middle consonant DOUBLES to keep the first vowel short: rabbit, kitten, button. Build each chunk in order.",
  workedExamples: [ { text: 'basket', note: 'Hear bas | ket → b · a · s · k · e · t' }, { text: 'rabbit', note: 'Hear rab | bit → r · a · bb · i · t (double b)' } ]
} }

writeFileSync(join(dir, 'phonics-L10-two-syllable.json'), JSON.stringify(
  { packId: 'phonics-L10-two-syllable', strand: 'phonics', skillIds: ['PH-two-syllable'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L10-two-syllable.json'), JSON.stringify(
  { packId: 'spelling-L10-two-syllable', strand: 'spelling', skillIds: ['SP-two-syllable'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode two-syllable items.`)
