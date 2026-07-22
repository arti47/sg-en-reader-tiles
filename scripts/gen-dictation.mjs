// T11 dictation generator (§12). Emits one sentence-dictation pack per SP-* envelope from
// blends → two-syllable, mirroring dictation-L02-cvc / dictation-L03-digraphs. Each item is a
// short decodable sentence; every word is segmented into its canonical greedy grapheme chunking
// (single-tile digraphs/teams/doubles) against the level's envelope, so the tiles match the encode
// packs. Distractor tiles are confusable graphemes not in the word. Run: node scripts/gen-dictation.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
const decode = JSON.parse(readFileSync(join(dir, 'decodability.json'), 'utf8'))

// Canonical greedy longest-match segmentation (same rule as lint-packs).
function segment(word, env) {
  const cfg = decode[env]; if (!cfg) throw new Error('no env ' + env)
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  const gs = [...cfg.graphemes].sort((a, b) => b.length - a.length)
  const out = []; let i = 0
  while (i < w.length) {
    const g = gs.find(g => w.startsWith(g, i))
    if (!g) throw new Error(`"${word}" not decodable in ${env} at "${w.slice(i)}"`)
    out.push(g); i += g.length
  }
  return out
}
const CONF = ['a', 'e', 'i', 'o', 'u', 'b', 'd', 'p', 'm', 'n', 't', 'l', 's', 'ck', 'sh', 'ch']
function distractors(graphemes) {
  const set = new Set(graphemes)
  return CONF.filter(g => !set.has(g)).slice(0, 2)
}

// Each level: env + prereq (dictation chain) + curated decodable sentences (word arrays).
const LEVELS = [
  { pack: 'dictation-L04-blends', skill: 'SP-blend-dictation', env: 'SP-blends', prereq: 'SP-digraph-dictation',
    objective: 'Spell short decodable sentences with consonant blends from dictation.',
    iCan: 'I can spell short sentences with blends.',
    lesson: { iCanStatement: 'I can spell short sentences with blends.', explanation: 'Listen to the sentence, then build it word by word. Blend words have two consonants you say quickly together, like st, fr and nd — build each sound in order.', workedExamples: [{ text: 'a frog can swim', note: 'fr·o·g — say each sound.' }, { text: 'Stan had a snack', note: 'sn·a·ck — ck is one tile.' }] },
    sents: [['a', 'frog', 'can', 'swim'], ['Stan', 'had', 'a', 'flag'], ['Fred', 'got', 'a', 'drum'], ['a', 'crab', 'can', 'grab'], ['Brad', 'had', 'a', 'snack'], ['a', 'twin', 'ran', 'fast'], ['Glen', 'got', 'a', 'gift'], ['Frank', 'had', 'a', 'brick'], ['a', 'frog', 'sat', 'on', 'a', 'log'], ['Stan', 'got', 'a', 'red', 'truck'], ['a', 'black', 'cat', 'ran'], ['Fran', 'had', 'a', 'fresh', 'plum'], ['Grant', 'can', 'spin', 'a', 'top'], ['a', 'clock', 'is', 'on', 'a', 'desk'], ['Chad', 'ran', 'and', 'ran'], ['a', 'crab', 'hid', 'in', 'mud'], ['a', 'sled', 'slid', 'fast'], ['Brent', 'held', 'a', 'lamp'], ['Glen', 'had', 'a', 'gift', 'and', 'a', 'flag'], ['Fred', 'must', 'stop'], ['a', 'frog', 'can', 'jump']] },
  { pack: 'dictation-L05-floss', skill: 'SP-floss-dictation', env: 'SP-floss', prereq: 'SP-blend-dictation',
    objective: 'Spell short decodable sentences with FLOSS words from dictation.',
    iCan: 'I can spell short sentences with ff, ll, ss and zz.',
    lesson: { iCanStatement: 'I can spell short sentences with ff, ll, ss and zz.', explanation: 'Some short words double the last f, l, s or z: hill, bell, miss, buzz. That double is one tile. Build each word you hear.', workedExamples: [{ text: 'a bell can ring', note: 'b·e·ll — ll is one tile.' }, { text: 'the frog will hop', note: 'w·i·ll — doubled l.' }] },
    sents: [['a', 'bell', 'can', 'ring'], ['Bill', 'had', 'a', 'ball'], ['a', 'frog', 'sat', 'on', 'a', 'hill'], ['Jeff', 'had', 'a', 'puff'], ['a', 'bee', 'can', 'buzz'], ['Nell', 'got', 'a', 'doll'], ['Russ', 'had', 'a', 'mess'], ['a', 'cliff', 'is', 'tall'], ['Bill', 'will', 'huff', 'and', 'puff'], ['a', 'bull', 'sat', 'in', 'grass'], ['Tess', 'had', 'a', 'red', 'dress'], ['a', 'shell', 'is', 'on', 'a', 'hill'], ['Jill', 'can', 'spell', 'well'], ['a', 'fluff', 'ball', 'fell'], ['Russ', 'will', 'pass', 'the', 'ball'], ['a', 'doll', 'is', 'on', 'a', 'hill'], ['Jeff', 'had', 'a', 'mess'], ['a', 'bell', 'will', 'ring'], ['Tess', 'lost', 'a', 'doll'], ['a', 'bull', 'ran', 'up', 'a', 'hill']] },
  { pack: 'dictation-L06-silent-e', skill: 'SP-silente-dictation', env: 'SP-silent-e', prereq: 'SP-floss-dictation',
    objective: 'Spell short decodable sentences with magic-e words from dictation.',
    iCan: 'I can spell short sentences with a bossy silent e.',
    lesson: { iCanStatement: 'I can spell short sentences with a bossy silent e.', explanation: 'Magic-e words end in a silent e that makes the vowel say its name: cake, bike, home. Remember to add the silent e at the end.', workedExamples: [{ text: 'Jake had a cake', note: 'c·a·k·e — silent e at the end.' }, { text: 'a bike is at home', note: 'b·i·k·e, h·o·m·e.' }] },
    sents: [['Jake', 'had', 'a', 'cake'], ['a', 'bike', 'is', 'at', 'home'], ['Kate', 'ate', 'a', 'lime'], ['a', 'mole', 'hid', 'in', 'a', 'hole'], ['Dave', 'got', 'a', 'kite'], ['a', 'mule', 'ran', 'to', 'a', 'gate'], ['Pete', 'gave', 'Jane', 'a', 'rose'], ['a', 'snake', 'hid', 'in', 'a', 'cave'], ['Mike', 'rode', 'home', 'late'], ['a', 'cube', 'is', 'on', 'a', 'plate'], ['Jane', 'had', 'five', 'limes'], ['a', 'bone', 'is', 'in', 'a', 'cage'], ['Nate', 'made', 'a', 'fire'], ['a', 'wave', 'came', 'to', 'shore'], ['Kate', 'and', 'Jake', 'bake', 'a', 'cake'], ['a', 'snake', 'is', 'in', 'a', 'cave'], ['Jane', 'rode', 'a', 'bike'], ['a', 'mole', 'made', 'a', 'hole'], ['Pete', 'gave', 'a', 'rose'], ['a', 'kite', 'is', 'by', 'a', 'pine']] },
  { pack: 'dictation-L07-vowel-teams', skill: 'SP-vowelteam-dictation', env: 'SP-vowel-teams', prereq: 'SP-silente-dictation',
    objective: 'Spell short decodable sentences with vowel-team words from dictation.',
    iCan: 'I can spell short sentences with vowel teams.',
    lesson: { iCanStatement: 'I can spell short sentences with vowel teams.', explanation: 'Vowel teams are two letters that make one vowel sound: ai, ee, oa, ea. The team is one tile. Build each word you hear.', workedExamples: [{ text: 'a boat is on the sea', note: 'b·oa·t, s·ea.' }, { text: 'Jean had a green bean', note: 'ee and ea teams.' }] },
    sents: [['a', 'boat', 'is', 'on', 'the', 'sea'], ['Jean', 'had', 'a', 'green', 'bean'], ['the', 'rain', 'fell', 'on', 'the', 'road'], ['a', 'goat', 'ate', 'a', 'leaf'], ['Joan', 'put', 'on', 'a', 'coat'], ['a', 'bee', 'sat', 'on', 'a', 'leaf'], ['Dean', 'can', 'see', 'the', 'moon'], ['a', 'train', 'is', 'on', 'the', 'track'], ['the', 'team', 'ran', 'in', 'the', 'rain'], ['a', 'seal', 'ate', 'meat'], ['Neil', 'keeps', 'seeds', 'in', 'a', 'jar'], ['a', 'boat', 'sails', 'to', 'sea'], ['the', 'moon', 'is', 'in', 'the', 'sky'], ['Dean', 'ate', 'beans', 'and', 'meat'], ['a', 'goat', 'and', 'a', 'sheep', 'eat', 'hay'], ['a', 'toad', 'sat', 'in', 'the', 'rain'], ['Jean', 'sees', 'a', 'green', 'tree'], ['the', 'sail', 'is', 'on', 'the', 'boat'], ['a', 'deer', 'ate', 'a', 'leaf'], ['the', 'moon', 'is', 'in', 'the', 'sky']] },
  { pack: 'dictation-L08-r-controlled', skill: 'SP-rcontrolled-dictation', env: 'SP-r-controlled', prereq: 'SP-vowelteam-dictation',
    objective: 'Spell short decodable sentences with bossy-r words from dictation.',
    iCan: 'I can spell short sentences with bossy r.',
    lesson: { iCanStatement: 'I can spell short sentences with bossy r.', explanation: 'When r follows a vowel it changes the sound: ar, or, er, ir, ur. The vowel and r make one tile. Build each word you hear.', workedExamples: [{ text: 'the car is far', note: 'c·ar, f·ar.' }, { text: 'a bird is on the perch', note: 'b·ir·d, p·er·ch.' }] },
    sents: [['the', 'car', 'is', 'far'], ['a', 'bird', 'sat', 'on', 'a', 'perch'], ['Bart', 'put', 'corn', 'in', 'a', 'cart'], ['her', 'shirt', 'is', 'dark'], ['a', 'horse', 'is', 'in', 'the', 'barn'], ['the', 'girl', 'has', 'a', 'card'], ['a', 'shark', 'swam', 'far'], ['turn', 'the', 'car', 'at', 'the', 'corner'], ['a', 'fork', 'is', 'on', 'the', 'cart'], ['her', 'purse', 'is', 'in', 'the', 'car'], ['Mark', 'has', 'a', 'short', 'cord'], ['the', 'nurse', 'gave', 'Bart', 'a', 'jar'], ['a', 'stork', 'is', 'by', 'the', 'shore'], ['the', 'farmer', 'feeds', 'the', 'horse'], ['her', 'scarf', 'is', 'warm'], ['the', 'bird', 'is', 'in', 'the', 'barn'], ['Mark', 'has', 'a', 'cart'], ['her', 'card', 'is', 'in', 'the', 'car'], ['a', 'shark', 'is', 'near', 'the', 'surf'], ['the', 'girl', 'has', 'a', 'fork']] },
  { pack: 'dictation-L09-diphthongs', skill: 'SP-diphthong-dictation', env: 'SP-diphthongs', prereq: 'SP-rcontrolled-dictation',
    objective: 'Spell short decodable sentences with diphthong words from dictation.',
    iCan: 'I can spell short sentences with oi, oy, ou, ow, aw and au.',
    lesson: { iCanStatement: 'I can spell short sentences with oi, oy, ou, ow, aw and au.', explanation: 'Gliding vowels come in teams: oi/oy (coin, boy), ou/ow (cloud, cow), aw/au (paw, Paul). Each team is one tile. Build each word you hear.', workedExamples: [{ text: 'the boy found a coin', note: 'b·oy, c·oi·n.' }, { text: 'a brown owl', note: 'br·ow·n, ow·l.' }] },
    sents: [['the', 'boy', 'found', 'a', 'coin'], ['a', 'brown', 'owl', 'hoots'], ['Roy', 'has', 'a', 'new', 'toy'], ['a', 'cow', 'is', 'in', 'the', 'town'], ['Paul', 'saw', 'a', 'hawk'], ['the', 'dog', 'has', 'a', 'sore', 'paw'], ['Joy', 'found', 'a', 'round', 'coin'], ['a', 'loud', 'crowd', 'shouts'], ['the', 'owl', 'flew', 'down'], ['a', 'boy', 'spoils', 'his', 'toy'], ['the', 'king', 'has', 'a', 'crown'], ['a', 'cat', 'has', 'sharp', 'claws'], ['Troy', 'sat', 'down', 'in', 'town'], ['the', 'cow', 'saw', 'an', 'owl'], ['Paul', 'draws', 'a', 'cow'], ['the', 'owl', 'is', 'in', 'the', 'town'], ['Roy', 'has', 'a', 'coin'], ['a', 'cow', 'ate', 'in', 'the', 'town'], ['Paul', 'saw', 'a', 'brown', 'owl'], ['the', 'boy', 'found', 'a', 'toy']] },
  { pack: 'dictation-L10-two-syllable', skill: 'SP-twosyllable-dictation', env: 'SP-two-syllable', prereq: 'SP-diphthong-dictation',
    objective: 'Spell short decodable sentences with two-syllable words from dictation.',
    iCan: 'I can spell short two-syllable sentences.',
    lesson: { iCanStatement: 'I can spell short two-syllable sentences.', explanation: 'Longer words split into two chunks: sun-set, nap-kin, rab-bit. Build each chunk, then the whole word. A double letter in the middle is one tile.', workedExamples: [{ text: 'the rabbit sat at sunset', note: 'rab·bit, sun·set.' }, { text: 'the kitten hid', note: 'kit·ten — tt is one tile.' }] },
    sents: [['the', 'rabbit', 'sat', 'at', 'sunset'], ['the', 'kitten', 'hid', 'in', 'a', 'basket'], ['we', 'had', 'a', 'picnic'], ['the', 'muffin', 'is', 'on', 'a', 'napkin'], ['a', 'robin', 'sat', 'on', 'the', 'mailbox'], ['the', 'magnet', 'is', 'in', 'a', 'pocket'], ['we', 'put', 'it', 'in', 'the', 'wagon'], ['the', 'puppet', 'sat', 'on', 'a', 'shelf'], ['the', 'rabbit', 'had', 'a', 'carrot'], ['a', 'robin', 'sat', 'on', 'the', 'chimney'], ['the', 'bandit', 'hid', 'in', 'a', 'tunnel'], ['the', 'kitten', 'and', 'the', 'puppy', 'nap'], ['a', 'muffin', 'is', 'in', 'the', 'basket'], ['the', 'wagon', 'ran', 'down', 'the', 'hilltop'], ['the', 'rabbit', 'ran', 'to', 'the', 'tunnel'], ['a', 'kitten', 'sat', 'on', 'the', 'wagon'], ['the', 'robin', 'is', 'on', 'the', 'chimney'], ['we', 'had', 'a', 'muffin', 'and', 'a', 'carrot'], ['the', 'bandit', 'hid', 'in', 'a', 'pocket'], ['the', 'puppy', 'ran', 'to', 'the', 'basket']] }
]

const num = i => String(i + 1).padStart(2, '0')
for (const L of LEVELS) {
  const items = L.sents.map((words, i) => ({
    id: `dic-${L.skill.split('-')[1]}-${num(i)}`,
    skillId: L.skill, itemType: 'dictation', difficulty: (i % 3) + 1,
    stem: 'Build the sentence you hear, word by word.',
    audioText: words.join(' ').toLowerCase(),
    words: words.map(w => { const t = w.toLowerCase(); const g = segment(t, L.env); return { text: t, graphemes: g, distractorGraphemes: distractors(g) } }),
    decodableWithin: L.env, missedConceptOnFail: 'sentence-dictation',
    rationale: `${words.join(' ')} — build each word from its sounds.`
  }))
  const pack = { packId: L.pack, strand: 'spelling', skillIds: [L.skill], version: 1, items, lessons: { [L.skill]: L.lesson } }
  writeFileSync(join(dir, 'packs', L.pack + '.json'), JSON.stringify(pack, null, 2) + '\n')
  console.log(`Wrote ${items.length} items → ${L.pack}`)
}
