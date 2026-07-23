// Sound effects + gentle ambient music (M6 §20.1), synthesised at runtime via the Web Audio API —
// NO asset files, fully offline. Mute-aware (Settings sfx/music/calm); music ducks while the TTS
// speaks so it never competes with the speech the child relies on. All wrapped in try/catch so a
// device without Web Audio is silently silent (never throws into the pedagogy path).
let sfxOn = true
let calm = false

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  try {
    if (!ctx) { const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!C) return null; ctx = new C() }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch { return null }
}

export function setSfxEnabled(on: boolean) { sfxOn = on }
export function setCalm(on: boolean) { calm = on }
export function setMusicEnabled(on: boolean) { if (on) startMusic(); else stopMusic() }

// One tone with an attack/decay envelope, scheduled `at` seconds from now.
function tone(c: AudioContext, freq: number, dur: number, type: OscillatorType, peak: number, at = 0) {
  const t0 = c.currentTime + at
  const o = c.createOscillator(); const g = c.createGain()
  o.type = type; o.frequency.setValueAtTime(freq, t0)
  const vol = peak * (calm ? 0.4 : 1)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g); g.connect(c.destination)
  o.start(t0); o.stop(t0 + dur + 0.02)
}
const seq = (c: AudioContext, notes: [number, number][], type: OscillatorType, peak: number, step: number) =>
  notes.forEach(([f, d], i) => tone(c, f, d, type, peak, i * step))

export type Sfx = 'tap' | 'correct' | 'wrong' | 'coin' | 'chest' | 'levelup' | 'rocket'
export function playSfx(name: Sfx) {
  if (!sfxOn) return
  const c = ac(); if (!c) return
  try {
    switch (name) {
      case 'tap': tone(c, 660, 0.06, 'sine', 0.15); break
      case 'correct': seq(c, [[523, 0.12], [784, 0.16]], 'sine', 0.2, 0.1); break // C5→G5
      case 'wrong': tone(c, 180, 0.18, 'sawtooth', 0.12); break                    // soft, low, non-harsh
      case 'coin': seq(c, [[988, 0.07], [1319, 0.12]], 'square', 0.16, 0.06); break // B5→E6
      case 'chest': seq(c, [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.24]], 'triangle', 0.2, 0.09); break
      case 'levelup': seq(c, [[523, 0.12], [659, 0.12], [784, 0.12], [1047, 0.12], [1319, 0.3]], 'triangle', 0.22, 0.1); break
      case 'rocket': { // frequency sweep through a lowpass = whoosh
        const o = c.createOscillator(); const g = c.createGain(); const lp = c.createBiquadFilter()
        const t0 = c.currentTime; lp.type = 'lowpass'; o.type = 'sawtooth'
        o.frequency.setValueAtTime(120, t0); o.frequency.exponentialRampToValueAtTime(900, t0 + 0.5)
        lp.frequency.setValueAtTime(400, t0); lp.frequency.exponentialRampToValueAtTime(2000, t0 + 0.5)
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime((calm ? 0.4 : 1) * 0.14, t0 + 0.05)
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55)
        o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + 0.6); break
      }
    }
  } catch { /* silent */ }
}

// ---- Gentle ambient music: a slow, quiet arpeggio loop. Default OFF. ----
let musicTimer: ReturnType<typeof setInterval> | null = null
let musicGain: GainNode | null = null
const CHORD = [261.63, 329.63, 392.0, 523.25] // C major, calm
function startMusic() {
  const c = ac(); if (!c || musicTimer) return
  try {
    musicGain = c.createGain(); musicGain.gain.value = calm ? 0.03 : 0.06; musicGain.connect(c.destination)
    let i = 0
    const tick = () => {
      if (!musicGain) return
      const t0 = c.currentTime
      const o = c.createOscillator(); const g = c.createGain()
      o.type = 'triangle'; o.frequency.value = CHORD[i % CHORD.length]; i++
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(1, t0 + 0.3)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6)
      o.connect(g); g.connect(musicGain); o.start(t0); o.stop(t0 + 1.7)
    }
    tick(); musicTimer = setInterval(tick, 900)
  } catch { /* silent */ }
}
function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null }
  try { musicGain?.disconnect() } catch { /* ignore */ } musicGain = null
}

// Duck the ambient music while TTS speaks (called from audio.speak()). No-op if music is off.
export function duckMusic() { if (musicGain) musicGain.gain.value = 0.008 }
export function unduckMusic() { if (musicGain) musicGain.gain.value = calm ? 0.03 : 0.06 }
