// Phonemic-awareness generator (§3 audit — the upstream oral skill for weak/dyslexic readers).
// Emits pa-cvc.json + pa-digraphs.json: pa_blend (hear separated sounds → pick the blended word)
// + pa_count (hear a word → how many sounds). Audio-only, MCQ, deterministic, no speech input.
// Served in Learn only (LearnRunner) as the FIRST step of the relevant units. pa_blend phonemeSeq
// ids must be manifested clips (single letters, sh, ch, th-unvoiced — no c/x/qu/ck, no clip).
// The digraph set teaches "two letters, ONE sound" (ship = /sh/ /i/ /p/ = 3 sounds, not 4).
// Run: node scripts/gen-pa.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'packs')
const num = i => String(i + 1).padStart(3, '0')

// Build a PA pack from blend rows [word, phonemeSeq, [d1,d2]] and count rows [word, seq(display), n].
function buildPack(packId, skillId, pfx, blend, count, lesson) {
  const items = []
  blend.forEach(([w, seq, [d1, d2]], i) => {
    const pos = i % 3, others = [d1, d2]
    const choices = [0, 1, 2].map(p => ({ id: 'abc'[p], label: p === pos ? w : others[p < pos ? p : p - 1] }))
    items.push({ id: `pa-${pfx}bl-${num(i)}`, skillId, itemType: 'pa_blend', difficulty: (i % 2) + 1,
      stem: 'Listen to the sounds. Which word is it?', audioText: w, phonemeSeq: seq,
      choices, correctChoiceId: 'abc'[pos], missedConceptOnFail: 'phoneme-blend',
      rationale: `${seq.join('-')} blends to ${w}.` })
  })
  count.forEach(([w, seq, n], i) => {
    const counts = [2, 3, 4]
    const choices = counts.map(c => ({ id: 'abc'[counts.indexOf(c)], label: String(c) }))
    items.push({ id: `pa-${pfx}ct-${num(i)}`, skillId, itemType: 'pa_count', difficulty: (i % 2) + 1,
      stem: 'How many sounds do you hear?', audioText: w,
      choices, correctChoiceId: 'abc'[counts.indexOf(n)], missedConceptOnFail: 'phoneme-count',
      rationale: `${w} has ${n} sounds: ${seq.join('-')}.` })
  })
  writeFileSync(join(dir, `${packId}.json`), JSON.stringify(
    { packId, strand: 'pa', skillIds: [skillId], version: 1, items, lessons: { [skillId]: lesson } }, null, 2) + '\n')
  console.log(`Wrote ${items.length} PA items → ${packId} (${blend.length} blend + ${count.length} count).`)
}

// ---- CVC set: single-letter phonemes only ----
const CVC_BLEND = [
  ['sat', ['s','a','t'], ['sit','sap']], ['pin', ['p','i','n'], ['pan','pit']], ['tap', ['t','a','p'], ['tip','top']],
  ['nap', ['n','a','p'], ['map','nip']], ['hen', ['h','e','n'], ['hot','hat']], ['red', ['r','e','d'], ['rid','bed']],
  ['dog', ['d','o','g'], ['dig','bog']], ['sun', ['s','u','n'], ['sit','bun']], ['bug', ['b','u','g'], ['big','bag']],
  ['mat', ['m','a','t'], ['met','mad']], ['jam', ['j','a','m'], ['jet','ham']], ['web', ['w','e','b'], ['wet','wig']],
]
const CVC_COUNT = [
  ['at', ['a','t'], 2], ['up', ['u','p'], 2], ['in', ['i','n'], 2], ['am', ['a','m'], 2], ['on', ['o','n'], 2], ['it', ['i','t'], 2],
  ['kit', ['k','i','t'], 3], ['sat', ['s','a','t'], 3], ['dog', ['d','o','g'], 3], ['bun', ['b','u','n'], 3], ['red', ['r','e','d'], 3], ['mop', ['m','o','p'], 3],
  ['lamp', ['l','a','m','p'], 4], ['hand', ['h','a','n','d'], 4], ['tent', ['t','e','n','t'], 4], ['milk', ['m','i','l','k'], 4], ['jump', ['j','u','m','p'], 4], ['fast', ['f','a','s','t'], 4],
]
buildPack('pa-cvc', 'PA-cvc', 'c', CVC_BLEND, CVC_COUNT, {
  iCanStatement: 'I can hear and blend the sounds in a word.',
  explanation: 'Every word is made of small sounds. If you hear the sounds one at a time — /s/ /a/ /t/ — you can blend them together to say the word: sat. You can also count the sounds you hear.',
  workedExamples: [ { text: 'sat', note: '/s/ /a/ /t/ → sat (3 sounds)' }, { text: 'up', note: '/u/ /p/ → up (2 sounds)' } ]
})

// ---- Digraph set: a digraph is ONE sound. Blend uses sh/ch/th clips; count teaches "3 not 4". ----
const T = 'th-unvoiced'
const DIG_BLEND = [
  ['ship', ['sh','i','p'], ['shop','shed']], ['shop', ['sh','o','p'], ['ship','chop']], ['shed', ['sh','e','d'], ['shop','ship']],
  ['shut', ['sh','u','t'], ['shot','shop']], ['chin', ['ch','i','n'], ['chip','chat']], ['chip', ['ch','i','p'], ['chin','ship']],
  ['chop', ['ch','o','p'], ['chip','shop']], ['chat', ['ch','a','t'], ['chin','chip']], ['thin', [T,'i','n'], ['chin','shin']],
  ['bath', ['b','a',T], ['bash','back']],
]
const DIG_COUNT = [
  ['ship', ['sh','i','p'], 3], ['chin', ['ch','i','n'], 3], ['bath', ['b','a','th'], 3], ['chop', ['ch','o','p'], 3],
  ['duck', ['d','u','ck'], 3], ['fish', ['f','i','sh'], 3], ['rich', ['r','i','ch'], 3], ['moth', ['m','o','th'], 3],
  ['sock', ['s','o','ck'], 3], ['such', ['s','u','ch'], 3],
  ['chest', ['ch','e','s','t'], 4], ['shift', ['sh','i','f','t'], 4], ['bench', ['b','e','n','ch'], 4], ['thump', [T,'u','m','p'], 4],
]
buildPack('pa-digraphs', 'PA-digraphs', 'd', DIG_BLEND, DIG_COUNT, {
  iCanStatement: 'I can hear that two letters can make one sound.',
  explanation: 'Some sounds are written with TWO letters — sh, ch, th, ck — but they still make just ONE sound. "ship" has three sounds: /sh/ /i/ /p/, not four. Listen for the sound, not the letters.',
  workedExamples: [ { text: 'ship', note: '/sh/ /i/ /p/ → ship (3 sounds)' }, { text: 'duck', note: '/d/ /u/ /ck/ → duck (3 sounds)' } ]
})
