// T05 FLOSS/doubling generator (§12 pipeline). Emits phonics-L05-floss.json +
// spelling-L05-floss.json. FLOSS: in a one-syllable word after a short vowel,
// final f/l/s/z double → ff/ll/ss/zz (each a SINGLE grapheme tile). Concept is
// derived from the doubled grapheme. Run: node scripts/gen-floss.mjs → lint.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [word, graphemes, difficulty, [decodeDistractor1, decodeDistractor2]]
const WORDS = [
  // -ff
  ['off', ['o','ff'], 1, ['puff','cuff']],
  ['puff', ['p','u','ff'], 1, ['cuff','huff']],
  ['cuff', ['c','u','ff'], 1, ['puff','huff']],
  ['huff', ['h','u','ff'], 2, ['puff','buff']],
  ['buff', ['b','u','ff'], 2, ['cuff','muff']],
  ['muff', ['m','u','ff'], 2, ['huff','buff']],
  ['cliff', ['c','l','i','ff'], 2, ['stiff','sniff']],
  ['stiff', ['s','t','i','ff'], 2, ['cliff','staff']],
  ['staff', ['s','t','a','ff'], 2, ['stiff','gruff']],
  ['sniff', ['s','n','i','ff'], 3, ['stiff','cliff']],
  ['gruff', ['g','r','u','ff'], 3, ['staff','puff']],
  ['doff', ['d','o','ff'], 3, ['off','puff']],
  // -ll
  ['bell', ['b','e','ll'], 1, ['tell','fell']],
  ['tell', ['t','e','ll'], 1, ['bell','sell']],
  ['sell', ['s','e','ll'], 1, ['well','fell']],
  ['well', ['w','e','ll'], 1, ['bell','yell']],
  ['fell', ['f','e','ll'], 1, ['sell','tell']],
  ['yell', ['y','e','ll'], 2, ['well','bell']],
  ['doll', ['d','o','ll'], 1, ['dull','bell']],
  ['hill', ['h','i','ll'], 1, ['fill','bill']],
  ['will', ['w','i','ll'], 1, ['hill','fill']],
  ['fill', ['f','i','ll'], 1, ['hill','bill']],
  ['bill', ['b','i','ll'], 2, ['fill','pill']],
  ['kill', ['k','i','ll'], 2, ['bill','mill']],
  ['mill', ['m','i','ll'], 2, ['pill','bill']],
  ['pill', ['p','i','ll'], 2, ['mill','fill']],
  ['gull', ['g','u','ll'], 2, ['dull','hull']],
  ['dull', ['d','u','ll'], 2, ['gull','doll']],
  ['hull', ['h','u','ll'], 3, ['gull','dull']],
  ['gill', ['g','i','ll'], 3, ['hill','mill']],
  // -ss
  ['miss', ['m','i','ss'], 1, ['kiss','hiss']],
  ['kiss', ['k','i','ss'], 1, ['miss','hiss']],
  ['hiss', ['h','i','ss'], 2, ['miss','kiss']],
  ['boss', ['b','o','ss'], 1, ['loss','moss']],
  ['loss', ['l','o','ss'], 2, ['boss','moss']],
  ['moss', ['m','o','ss'], 2, ['boss','toss']],
  ['toss', ['t','o','ss'], 2, ['loss','moss']],
  ['mass', ['m','a','ss'], 2, ['mess','miss']],
  ['less', ['l','e','ss'], 1, ['mess','loss']],
  ['mess', ['m','e','ss'], 1, ['less','mass']],
  ['pass', ['p','a','ss'], 1, ['mass','fuss']],
  ['fuss', ['f','u','ss'], 2, ['muss','mass']],
  ['muss', ['m','u','ss'], 3, ['fuss','mass']],
  ['class', ['c','l','a','ss'], 2, ['glass','grass']],
  ['grass', ['g','r','a','ss'], 2, ['glass','brass']],
  ['dress', ['d','r','e','ss'], 2, ['press','bless']],
  ['press', ['p','r','e','ss'], 3, ['dress','bless']],
  ['cross', ['c','r','o','ss'], 2, ['floss','gloss']],
  ['floss', ['f','l','o','ss'], 3, ['cross','gloss']],
  ['glass', ['g','l','a','ss'], 2, ['class','grass']],
  ['bless', ['b','l','e','ss'], 3, ['dress','press']],
  ['brass', ['b','r','a','ss'], 3, ['grass','class']],
  ['gloss', ['g','l','o','ss'], 3, ['cross','floss']],
  // -zz
  ['buzz', ['b','u','zz'], 1, ['fuzz','jazz']],
  ['fizz', ['f','i','zz'], 2, ['buzz','fuzz']],
  ['jazz', ['j','a','zz'], 2, ['buzz','razz']],
  ['fuzz', ['f','u','zz'], 2, ['buzz','fizz']],
  ['razz', ['r','a','zz'], 3, ['jazz','fizz']],
]

const DOUBLE = { ff: 'floss-ff', ll: 'floss-ll', ss: 'floss-ss', zz: 'floss-zz' }
const conceptOf = g => DOUBLE[g.find(x => DOUBLE[x])]
const POOL = ['ff','ll','ss','zz','f','l','s','z','sh','ch','th','ck','b','d','m','p','t','n','a','e','i','o','u']
const encodeDistractors = (g, d) => POOL.filter(x => !g.includes(x)).slice(0, d + 1)
const num = i => String(i + 1).padStart(3, '0')

const decode = WORDS.map(([w, g, d, dd], i) => {
  const pos = i % 3, others = [dd[0], dd[1]]
  const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
  return { id: `ph-fl-${num(i)}`, skillId: 'PH-floss', itemType: 'decode_choice', difficulty: d,
    stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
    missedConceptOnFail: conceptOf(g), rationale: `${g.join('-')} = ${w}.`, decodableWithin: 'PH-floss' }
})
const spell = WORDS.map(([w, g, d], i) => ({
  id: `sp-fl-${num(i)}`, skillId: 'SP-floss', itemType: 'build_word', difficulty: d,
  stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
  distractorGraphemes: encodeDistractors(g, d), missedConceptOnFail: conceptOf(g),
  rationale: `${w} = ${g.join('-')}.`, decodableWithin: 'SP-floss' }))

const phLesson = { 'PH-floss': {
  iCanStatement: 'I can read words that end in ff, ll, ss and zz.',
  explanation: 'When a short word ends in the sound /f/, /l/, /s/ or /z/ right after a short vowel, it is usually written with TWO letters: ff, ll, ss, zz. They still make just one sound — bell says /bel/, miss says /mis/.',
  workedExamples: [ { text: 'bell', note: 'b · e · ll → bell (ll = one /l/ sound)' }, { text: 'miss', note: 'm · i · ss → miss' } ]
} }
const spLesson = { 'SP-floss': {
  iCanStatement: 'I can spell words that end in ff, ll, ss and zz.',
  explanation: 'The FLOSS rule: in a one-syllable word, when f, l, s or z comes right after a short vowel at the end, DOUBLE it — off (not of), bell (not bel), miss (not mis), buzz. Use the double-letter tile.',
  workedExamples: [ { text: 'puff', note: 'Hear p-u-ff → tiles p · u · ff' }, { text: 'doll', note: 'Hear d-o-ll → tiles d · o · ll' } ]
} }

writeFileSync(join(dir, 'phonics-L05-floss.json'), JSON.stringify(
  { packId: 'phonics-L05-floss', strand: 'phonics', skillIds: ['PH-floss'], version: 1, items: decode, lessons: phLesson }, null, 2) + '\n')
writeFileSync(join(dir, 'spelling-L05-floss.json'), JSON.stringify(
  { packId: 'spelling-L05-floss', strand: 'spelling', skillIds: ['SP-floss'], version: 1, items: spell, lessons: spLesson }, null, 2) + '\n')
console.log(`Wrote ${decode.length} decode + ${spell.length} encode FLOSS items.`)
