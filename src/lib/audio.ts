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

// STUB: isolated-phoneme clips (~44) not yet recorded. TTS can't voice /sh/ reliably.
// Falls back to no-op + console note until real assets ship (ledger T01).
export function phoneme(id: string) {
  console.info(`[audio.phoneme] stub — no clip for "${id}" yet (TTS-only pass)`)
}
