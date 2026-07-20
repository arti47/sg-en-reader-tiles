// Offline audio service (CLAUDE.md §6c). TTS-only this pass; phoneme() stubbed.
let rate = 0.9
export function setRate(r: number) { rate = r }

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    synth.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-GB'
    u.rate = rate
    const gb = synth.getVoices().find(v => /en-GB/i.test(v.lang))
    if (gb) u.voice = gb
    synth.speak(u)
  } catch { /* no TTS available — silent */ }
}

// Isolated-phoneme clips (§6c): bundled static assets under public/phonemes/, resolved via
// the manifest. Cached HTMLAudioElements, replayable. If a clip isn't present yet (files
// pending recording — T01), playback rejects and is swallowed silently (no console error).
import manifest from '../data/phonemes.json'
const clips = new Map<string, HTMLAudioElement>()
export function phoneme(id: string) {
  try {
    const file = (manifest as Record<string, string>)[id]
    if (!file || typeof Audio === 'undefined') return
    let a = clips.get(id)
    if (!a) { a = new Audio(import.meta.env.BASE_URL + 'phonemes/' + file); clips.set(id, a) }
    a.currentTime = 0
    void a.play().catch(() => { /* clip missing/blocked — silent until recorded */ })
  } catch { /* no audio available — silent */ }
}
