// M5.1 sound metadata generator (§19.13.7). Emits src/data/sounds.json — one row per phoneme:
// { id, keyword, articulation, firstPattern, spellings:[{grapheme,pattern}] }. `id` matches the
// phonemes.json clip ids; `firstPattern` = the scope skill whose Learn unit introduces the sound
// (null = deferred). `spellings` = every grapheme + the pattern that teaches that spelling (drives
// "same sound, new spelling" cards + the Sound wall). Run: node scripts/gen-sounds.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')

const CVC = 'PH-cvc-short-vowels', DIG = 'PH-digraphs', SE = 'PH-silent-e', VT = 'PH-vowel-teams'
const RC = 'PH-r-controlled', DIP = 'PH-diphthongs', NG = 'PH-ng', RVT = 'PH-r-vowel-teams'

// [id, keyword, articulation, firstPattern, [[grapheme, pattern], ...]]
const single = (id, kw, art) => [id, kw, art, CVC, [[id, CVC]]]
const ROWS = [
  single('b', 'ball', 'Lips together, then pop them apart — /b/'),
  single('d', 'dog', 'Tongue taps behind your top teeth — /d/'),
  single('f', 'fan', 'Top teeth on your bottom lip, blow — /fff/'),
  single('g', 'goat', 'Back of the tongue, quick — /g/'),
  single('h', 'hat', 'Open your mouth and breathe out — /h/'),
  single('j', 'jam', 'Tongue up, push it out — /j/'),
  single('k', 'kite', 'Back of the tongue, quick — /k/'),
  single('l', 'leg', 'Tongue behind your top teeth, hum — /lll/'),
  single('m', 'man', 'Lips together, hum — /mmm/'),
  single('n', 'net', 'Tongue behind your top teeth, hum — /nnn/'),
  single('p', 'pig', 'Lips together, then a quiet pop — /p/'),
  single('r', 'rat', 'Round your lips and growl — /rrr/'),
  single('s', 'sun', 'Teeth together, hiss like a snake — /sss/'),
  single('t', 'tap', 'Tongue taps behind your top teeth — /t/'),
  single('v', 'van', 'Top teeth on your bottom lip, buzz — /vvv/'),
  single('w', 'web', 'Round your lips — /w/'),
  single('y', 'yak', 'Smile, tongue up — /y/'),
  single('z', 'zip', 'Teeth together, buzz like a bee — /zzz/'),
  single('a', 'apple', 'Open your mouth, short — /a/'),
  single('e', 'egg', 'Mouth a little open — /e/'),
  single('i', 'insect', 'Smile a little — /i/'),
  single('o', 'orange', 'Round mouth, short — /o/'),
  single('u', 'umbrella', 'Mouth relaxed, short — /u/'),
  ['sh', 'ship', 'Lips forward, quiet air — /shhh/', DIG, [['sh', DIG]]],
  ['ch', 'chip', 'Lips forward, short puff — /ch/', DIG, [['ch', DIG]]],
  ['th-unvoiced', 'thin', 'Tongue between your teeth, blow — /th/', DIG, [['th', DIG]]],
  ['th-voiced', 'this', 'Tongue between your teeth, buzz — /th/', DIG, [['th', DIG]]],
  ['ng', 'ring', 'Back of the tongue, hum through your nose — /ng/', NG, [['ng', NG], ['nk', NG]]],
  ['ai', 'cake', "Say the letter a's name — /ai/", SE, [['a_e', SE], ['ai', VT], ['ay', VT]]],
  ['igh', 'bike', "Say the letter i's name — /igh/", SE, [['i_e', SE], ['igh', VT]]],
  ['oa', 'home', "Say the letter o's name — /oa/", SE, [['o_e', SE], ['oa', VT], ['ow', VT]]],
  ['ee', 'feet', "Smile wide, say e's name — /ee/", VT, [['ee', VT], ['ea', VT]]],
  ['oo-long', 'moon', 'Round your lips, long — /oo/', VT, [['oo', VT], ['ew', VT], ['ue', VT]]],
  ['ar', 'car', 'Open your mouth and add r — /ar/', RC, [['ar', RC]]],
  ['or', 'fork', 'Round your mouth and add r — /or/', RC, [['or', RC], ['aw', DIP], ['au', DIP]]],
  ['ur', 'her', 'The bossy-r sound — /ur/ (er, ir, ur)', RC, [['er', RC], ['ir', RC], ['ur', RC]]],
  ['oi', 'coin', 'Lips round, then smile — /oi/', DIP, [['oi', DIP], ['oy', DIP]]],
  ['ow', 'cow', 'Open, then round your lips — /ow/', DIP, [['ow', DIP], ['ou', DIP]]],
  ['oo-short', 'book', 'Short and quick — /oo/', DIP, [['oo', DIP]]],
  ['ear', 'hear', 'The /ear/ sound, like in hear', RVT, [['ear', RVT]]],
  ['air', 'hair', 'The /air/ sound, like in hair', RVT, [['air', RVT]]],
  ['ure', 'cure', 'The /ure/ sound, like in cure', RVT, [['ure', RVT]]],
  ['schwa', 'about', 'The lazy /uh/ sound in longer words', null, []],
  ['zh', 'measure', 'A soft buzzy /zh/ sound', null, []]
]

const sounds = ROWS.map(([id, keyword, articulation, firstPattern, spellings]) => ({
  id, keyword, articulation, firstPattern,
  spellings: spellings.map(([grapheme, pattern]) => ({ grapheme, pattern }))
}))
writeFileSync(join(dir, 'sounds.json'), JSON.stringify(sounds, null, 2) + '\n')
console.log(`sounds.json: ${sounds.length} phonemes (${sounds.filter(s => s.firstPattern).length} placed, ${sounds.filter(s => !s.firstPattern).length} deferred)`)
