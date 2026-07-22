// T02 CVC generator — SPLIT into four OG "satpin" sub-units so a Learn unit introduces only ~6
// new letter-sounds at a time (owner: "23 sounds, too many at one go"). Classic teaching order:
//   set 1 s,a,t,p,i,n → set 2 c,k,e,h,r,m,d → set 3 g,o,u,l,f,b → set 4 j,v,w,x,y,z,qu
// Each set reads/spells REAL CVC words decodable from the sounds taught so far (cumulative).
// Run: node scripts/gen-cvc.mjs
import { writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// Curated CVC words per set — each decodable using only the letters taught at/ before its set.
const SETS = [
  { id: 'cvc-1', pfx: 'c1', file: 'L02a-cvc-1', letters: ['s','a','t','p','i','n'],
    words: ['sat','sap','tap','tan','nap','pan','pat','sit','sip','sin','tip','tin','pit','pin','nip'],
    ph: { iCanStatement: 'I can read short words with s, a, t, p, i, n.',
      explanation: "Learn six sounds: s, a, t, p, i, n. Say each sound, then blend them together to read a word: s-a-t → sat, p-i-n → pin. Read left to right, sound by sound.",
      workedExamples: [ { text: 'sat', note: 's · a · t → sat' }, { text: 'pin', note: 'p · i · n → pin' } ] },
    sp: { iCanStatement: 'I can spell short words with s, a, t, p, i, n.',
      explanation: "Say the word slowly and listen for each sound, then build it with the tiles: sat → s · a · t. Use the six sounds s, a, t, p, i, n.",
      workedExamples: [ { text: 'tap', note: 'Hear t-a-p → t · a · p' }, { text: 'sit', note: 'Hear s-i-t → s · i · t' } ] } },
  { id: 'cvc-2', pfx: 'c2', file: 'L02b-cvc-2', letters: ['s','a','t','p','i','n','c','k','e','h','r','m','d'],
    words: ['cat','can','cap','ham','hat','had','ran','ram','rat','mat','map','man','mad','kit','kid','hen','men','ten','net','red'],
    ph: { iCanStatement: 'I can read short words with c, k, e, h, r, m, d.',
      explanation: "New sounds: c and k (both say /k/), e, h, r, m, d. Blend them with the sounds you know: c-a-t → cat, h-e-n → hen, r-e-d → red.",
      workedExamples: [ { text: 'cat', note: 'c · a · t → cat' }, { text: 'hen', note: 'h · e · n → hen' } ] },
    sp: { iCanStatement: 'I can spell short words with c, k, e, h, r, m, d.',
      explanation: "Listen for each sound and build the word. The /k/ sound is often c before a, o, u (cat) and k before i, e (kit).",
      workedExamples: [ { text: 'red', note: 'Hear r-e-d → r · e · d' }, { text: 'man', note: 'Hear m-a-n → m · a · n' } ] } },
  { id: 'cvc-3', pfx: 'c3', file: 'L02c-cvc-3', letters: ['s','a','t','p','i','n','c','k','e','h','r','m','d','g','o','u','l','f','b'],
    words: ['dog','cot','dot','hop','hot','pot','top','mop','log','bug','bus','cub','cup','cut','gum','hug','mug','mud','nut','run','rug','sun','fun','big'],
    ph: { iCanStatement: 'I can read short words with g, o, u, l, f, b.',
      explanation: "New sounds: g, o, u, l, f, b. Now you can read words with all five short vowels: d-o-g → dog, b-u-g → bug, l-o-g → log.",
      workedExamples: [ { text: 'dog', note: 'd · o · g → dog' }, { text: 'bug', note: 'b · u · g → bug' } ] },
    sp: { iCanStatement: 'I can spell short words with g, o, u, l, f, b.',
      explanation: "Say the word slowly and build each sound. Watch the vowel in the middle: hop has short o, hug has short u.",
      workedExamples: [ { text: 'hop', note: 'Hear h-o-p → h · o · p' }, { text: 'mud', note: 'Hear m-u-d → m · u · d' } ] } },
  { id: 'cvc-4', pfx: 'c4', file: 'L02d-cvc-4', letters: ['s','a','t','p','i','n','c','k','e','h','r','m','d','g','o','u','l','f','b','j','v','w','x','y','z','qu'],
    words: ['jam','jet','job','jog','jug','van','vet','web','wet','wig','win','box','fox','fix','six','mix','wax','yam','yes','zap','zip','zig','quit','quiz'],
    ph: { iCanStatement: 'I can read short words with j, v, w, x, y, z and qu.',
      explanation: "The last sounds: j, v, w, x (/ks/), y, z, and qu (/kw/). Blend them to read: j-a-m → jam, b-o-x → box, qu-i-z → quiz. Now you know all the letter sounds!",
      workedExamples: [ { text: 'jam', note: 'j · a · m → jam' }, { text: 'box', note: 'b · o · x → box' } ] },
    sp: { iCanStatement: 'I can spell short words with j, v, w, x, y, z and qu.',
      explanation: "Build each sound. x is one tile that says /ks/ (box). qu is one tile that says /kw/ (quiz) — q and u always go together.",
      workedExamples: [ { text: 'box', note: 'Hear b-o-x → b · o · x' }, { text: 'quiz', note: 'Hear qu-i-z → qu · i · z' } ] } }
]

// Split a word into grapheme tiles (single letters, but 'qu' is one tile).
const segs = w => { const o = []; for (let i = 0; i < w.length;) { if (w.slice(i, i + 2) === 'qu') { o.push('qu'); i += 2 } else { o.push(w[i]); i++ } } return o }
const vowelOf = w => [...w].find(c => 'aeiou'.includes(c))
const num = i => String(i + 1).padStart(3, '0')

for (const f of ['phonics-L02-cvc-short-vowels.json', 'spelling-L02-cvc-short-vowels.json']) {
  try { rmSync(join(dir, f)) } catch { /* already gone */ }
}

let cumulative = []
for (const s of SETS) {
  cumulative = [...new Set([...cumulative, ...s.letters])]
  const pool = [...cumulative]
  const words = s.words
  const decode = words.map((w, i) => {
    const d = (i % 3) + 1
    const others = [words[(i + 1) % words.length], words[(i + 2) % words.length]]
    const pos = i % 3
    const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
    return { id: `ph-${s.pfx}-${num(i)}`, skillId: `PH-${s.id}`, itemType: 'decode_choice', difficulty: d,
      stem: 'Tap the word you hear.', audioText: w, choices, correctChoiceId: 'abc'[pos],
      missedConceptOnFail: `vowel-short-${vowelOf(w)}`, rationale: `${segs(w).join('-')} = ${w}.`, decodableWithin: `PH-${s.id}` }
  })
  const spell = words.map((w, i) => {
    const d = (i % 3) + 1
    const g = segs(w)
    const dist = pool.filter(x => !g.includes(x)).slice(0, d + 1)
    return { id: `sp-${s.pfx}-${num(i)}`, skillId: `SP-${s.id}`, itemType: 'build_word', difficulty: d,
      stem: 'Build the word you hear.', displayWord: w, audioText: w, graphemes: g,
      distractorGraphemes: dist, missedConceptOnFail: `vowel-short-${vowelOf(w)}`,
      rationale: `${w} = ${g.join('-')}.`, decodableWithin: `SP-${s.id}` }
  })
  writeFileSync(join(dir, `phonics-${s.file}.json`), JSON.stringify(
    { packId: `phonics-${s.file}`, strand: 'phonics', skillIds: [`PH-${s.id}`], version: 1, items: decode, lessons: { [`PH-${s.id}`]: s.ph } }, null, 2) + '\n')
  writeFileSync(join(dir, `spelling-${s.file}.json`), JSON.stringify(
    { packId: `spelling-${s.file}`, strand: 'spelling', skillIds: [`SP-${s.id}`], version: 1, items: spell, lessons: { [`SP-${s.id}`]: s.sp } }, null, 2) + '\n')
  console.log(`Wrote ${decode.length} decode + ${spell.length} encode for ${s.id}.`)
}
