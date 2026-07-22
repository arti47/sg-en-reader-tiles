// Offline audio service (CLAUDE.md §6c). TTS via speak(); isolated phonemes via
// phoneme() (bundled public/phonemes/*.m4a clips, resolved through the manifest).
let rate = 0.4
export function setRate(r: number) { rate = r }

// Selected TTS voice (by voiceURI, chosen in parent Settings). Null → auto: first en-GB.
let voiceURI: string | null = null
export function setVoice(uri: string | null | undefined) { voiceURI = uri ?? null }

// Voices offered in the Settings picker: Samantha only (owner choice). getVoices() is
// often empty until the async `voiceschanged` fires, so callers should also listen (below).
export function listVoices(): SpeechSynthesisVoice[] {
  try {
    const synth = window.speechSynthesis
    if (!synth) return []
    return synth.getVoices().filter(v => /samantha/i.test(v.name))
  } catch { return [] }
}

// Register a callback for when the voice list becomes available/changes. Returns an
// unsubscribe fn. Fires once immediately if voices are already loaded.
export function onVoicesReady(cb: () => void): () => void {
  try {
    const synth = window.speechSynthesis
    if (!synth) return () => {}
    if (synth.getVoices().length) cb()
    synth.addEventListener('voiceschanged', cb)
    return () => synth.removeEventListener('voiceschanged', cb)
  } catch { return () => {} }
}

export function speak(text: string) {
  try {
    const synth = window.speechSynthesis
    if (!synth) return
    // iOS Safari drops a speak() that immediately follows cancel() when nothing is
    // queued, so only cancel to interrupt an in-flight utterance; resume if paused.
    if (synth.speaking || synth.pending) synth.cancel()
    if (synth.paused) synth.resume()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = rate
    const voices = synth.getVoices()
    // Prefer the chosen voice; else Samantha (owner default); else first en-GB; else platform default.
    const chosen = (voiceURI && voices.find(v => v.voiceURI === voiceURI))
      || voices.find(v => /samantha/i.test(v.name))
      || voices.find(v => /en-GB/i.test(v.lang))
    if (chosen) { u.voice = chosen; u.lang = chosen.lang } else u.lang = 'en-GB'
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
