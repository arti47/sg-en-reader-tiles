// M5.1 phoneme sound metadata (§19.13). Pure lookups over the static sounds.json (one row per
// phoneme: clip id, keyword, articulation cue, the pattern that first teaches it, and every
// grapheme+pattern that spells it). Drives the Learn sound-intro step + the Sound wall.
import raw from '../data/sounds.json'

export interface Spelling { grapheme: string; pattern: string }
export interface Sound { id: string; keyword: string; articulation: string; firstPattern: string | null; spellings: Spelling[] }
export const SOUNDS = raw as Sound[]

// NEW sounds a pattern's Learn unit introduces (first occurrence of each), in manifest order.
export function newSoundsFor(patternId: string): Sound[] {
  return SOUNDS.filter(s => s.firstPattern === patternId)
}

// Already-introduced sounds that gain a NEW spelling at this pattern → "same sound, new spelling"
// cards. Returns each such sound with just the grapheme(s) taught at this pattern.
export function newSpellingsFor(patternId: string): { sound: Sound; graphemes: string[] }[] {
  const out: { sound: Sound; graphemes: string[] }[] = []
  for (const s of SOUNDS) {
    if (!s.firstPattern || s.firstPattern === patternId) continue
    const gs = s.spellings.filter(sp => sp.pattern === patternId).map(sp => sp.grapheme)
    if (gs.length) out.push({ sound: s, graphemes: gs })
  }
  return out
}

// Sounds introduced so far (their first-taught pattern is learned) — for the Sound wall. Each
// carries only the spellings whose pattern is also learned (no spoilers for untaught spellings).
export function introducedSounds(learned: Set<string>): Sound[] {
  return SOUNDS
    .filter(s => s.firstPattern && learned.has(s.firstPattern))
    .map(s => ({ ...s, spellings: s.spellings.filter(sp => learned.has(sp.pattern)) }))
}
