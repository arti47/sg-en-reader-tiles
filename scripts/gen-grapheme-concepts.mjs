// Grapheme → error-taxonomy concept map (§7). Used by scoring.ts for grapheme-level error
// analysis: on an encode SUBSTITUTION (wrong tile at a matching position) the concept is
// derived from the EXPECTED grapheme, so struggle detection + the dashboard "stuck on" report
// the precise confusion (vowel-short-a, digraph-sh, r-controlled-ar, consonant-b for a b/d
// reversal…) instead of one generic per-item tag. Omissions/insertions fall back to the item's
// authored missedConceptOnFail (which handles silent-e drops etc.). Run: node scripts/gen-grapheme-concepts.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')

const map = {}
const put = (list, fn) => { for (const g of list) map[g] = fn(g) }

put(['a', 'e', 'i', 'o', 'u'], g => `vowel-short-${g}`)
put(['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'qu', 'r', 's', 't', 'v', 'w', 'x', 'y', 'z'], g => `consonant-${g}`)
put(['sh', 'ch', 'th', 'ck'], g => `digraph-${g}`)
put(['ff', 'll', 'ss', 'zz'], g => `floss-${g}`)
put(['bb', 'cc', 'dd', 'gg', 'mm', 'nn', 'pp', 'rr', 'tt'], g => `medial-double-${g[0]}`)
put(['ai', 'ay', 'ee', 'ea', 'oa', 'ow', 'oo', 'ew', 'ue', 'igh'], g => `vowel-team-${g}`)
put(['ar', 'or', 'er', 'ir', 'ur'], g => `r-controlled-${g}`)
put(['oi', 'oy', 'ou', 'aw', 'au'], g => `diphthong-${g}`)

writeFileSync(join(dir, 'graphemeConcepts.json'), JSON.stringify(map, null, 0) + '\n')
console.log(`graphemeConcepts: ${Object.keys(map).length} graphemes mapped`)
