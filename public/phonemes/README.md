# Phoneme audio clips (§6c)

Drop the recorded sound clips here as `<id>.m4a` (iPhone Voice Memos export `.m4a` directly — no conversion). Record the **sound**, not the letter name ("mmmm", not "em"); ~0.3–1 s, trimmed, consistent volume. Names must match `src/data/phonemes.json` exactly.

## T01 (letter-sounds) needs these 23 first
`a` `e` `i` `o` `u` — short vowels (ant, egg, ink, on, up)
`b` `d` `f` `g` `h` `j` `k` `l` `m` `n` `p` `r` `s` `t` `v` `w` `y` `z` — consonants

Once all 23 are here: set `PH-letter-sounds` `enabled: true` in `src/data/scopeAndSequence.json`, re-run `npm run build` + `npm test`, and the level goes live.

## Remaining 21 (later levels: digraphs / vowel teams)
`ch` `sh` `zh` `th-unvoiced` `th-voiced` `ng` `ai` `ee` `igh` `oa` `oo-long` `oo-short` `ar` `or` `ur` `ow` `oi` `ear` `air` `ure` `schwa`
