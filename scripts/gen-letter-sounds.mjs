// T01 letter-sounds generator (§12 pipeline). Emits phonics-L01-letter-sounds.json:
// the foundational single-letter → sound level (below CVC). Item type decode_choice,
// but the PROMPT is an isolated phoneme played from a bundled clip (audio.phoneme), so
// each item carries `phonemeId` (resolved via src/data/phonemes.json). Task: hear the
// sound → tap the letter that makes it. Distractors are curated to never share the played
// sound (e.g. the /k/ item never offers 'c'). Run: node scripts/gen-letter-sounds.mjs
//
// Covers the 23 single-letter sounds (18 consonants + 5 short vowels). Digraph sounds
// (sh, ch, th, ng…) and long-vowel teams belong to later levels, not letter-sounds.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')

// [phonemeId, letter, keyword, [distractor letters — none make the target sound]]
const ROWS = [
  ['a', 'a', 'ant', ['e', 'o', 'i']],
  ['e', 'e', 'egg', ['a', 'i', 'u']],
  ['i', 'i', 'ink', ['e', 'a', 'o']],
  ['o', 'o', 'orange', ['a', 'u', 'e']],
  ['u', 'u', 'umbrella', ['o', 'a', 'e']],
  ['b', 'b', 'bat', ['d', 'p', 'h']],
  ['d', 'd', 'dog', ['b', 'p', 'g']],
  ['f', 'f', 'fan', ['t', 'l', 's']],
  ['g', 'g', 'goat', ['d', 'p', 'b']],
  ['h', 'h', 'hat', ['n', 'm', 'k']],
  ['j', 'j', 'jam', ['y', 'l', 'z']],
  ['k', 'k', 'kite', ['t', 'l', 'f']],
  ['l', 'l', 'leg', ['r', 't', 'f']],
  ['m', 'm', 'man', ['n', 'w', 'r']],
  ['n', 'n', 'net', ['m', 'h', 'r']],
  ['p', 'p', 'pig', ['b', 'd', 'r']],
  ['r', 'r', 'rat', ['n', 'l', 'w']],
  ['s', 's', 'sun', ['f', 't', 'l']],
  ['t', 't', 'tap', ['k', 'f', 'l']],
  ['v', 'v', 'van', ['w', 'y', 'r']],
  ['w', 'w', 'web', ['m', 'v', 'r']],
  ['y', 'y', 'yak', ['v', 'w', 'j']],
  ['z', 'z', 'zip', ['v', 'l', 'r']]
]

const letters = 'abcdefghijklmnopqrstuvwxyz'
let items = []
for (const [ph, letter, keyword, distractors] of ROWS) {
  // Two items per sound (variety, §6d): d1 with 2 distractors, d2 with 3.
  for (const [n, difficulty, dCount] of [[1, 1, 2], [2, 2, 3]]) {
    const pool = distractors.slice(0, dCount)
    const labels = [letter, ...pool]
    // vary correct position deterministically
    const pos = (letters.indexOf(letter) + n) % labels.length
    ;[labels[0], labels[pos]] = [labels[pos], labels[0]]
    const choices = labels.map((l, i) => ({ id: 'abcd'[i], label: l }))
    const correctChoiceId = choices.find(c => c.label === letter).id
    items.push({
      id: `ls-${letter}-${n}`,
      skillId: 'PH-letter-sounds',
      itemType: 'decode_choice',
      difficulty,
      stem: 'Which letter makes this sound? Tap 🔊 to hear it.',
      phonemeId: ph,
      choices,
      correctChoiceId,
      missedConceptOnFail: `letter-sound-${letter}`,
      decodableWithin: 'PH-letter-sounds',
      rationale: `The letter '${letter}' makes the sound you hear, like at the start of ${keyword}.`
    })
  }
}

const pack = {
  packId: 'phonics-L01-letter-sounds',
  strand: 'phonics',
  skillIds: ['PH-letter-sounds'],
  version: 1,
  items,
  lessons: {
    'PH-letter-sounds': {
      iCanStatement: 'I can hear the sound each letter makes.',
      explanation: "Every letter makes a sound. Tap the speaker to hear a sound, then find the letter that makes it. Remember to say the sound, not the letter's name — 'mmm', not 'em'.",
      workedExamples: [
        { text: 'man', note: "m makes the first sound in man — /mmm/." },
        { text: 'ant', note: 'a makes the first sound in ant — /a/.' }
      ]
    }
  }
}

writeFileSync(join(dir, 'phonics-L01-letter-sounds.json'), JSON.stringify(pack, null, 2) + '\n')
console.log(`phonics-L01-letter-sounds: ${items.length} items, ${ROWS.length} sounds`)
console.log('phoneme ids used:', [...new Set(ROWS.map(r => r[0]))].join(' '))
