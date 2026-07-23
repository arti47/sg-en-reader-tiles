import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, SkillDef, PatternStatus } from '../types'
import { pickItem, getSkill, getLesson } from '../lib/packs'
import { nextToLearn, PATTERNS, learnedSet, needsReviewSet, patternStatus } from '../lib/learn'
import { getLearn, setLearned, clearReview, getProgress, getSettings } from '../store'
import { setRate, setVoice, phoneme, speak } from '../lib/audio'
import { newSoundsFor, newSpellingsFor, type Sound } from '../lib/sounds'
import { paItemsFor } from '../lib/pa'
import { McqItem } from './items/McqItem'
import { TileItem } from './items/TileItem'
import { LessonView } from './LessonView'
import { LearnMap } from './LearnMap'

type MapRow = { id: string; label: string; status: PatternStatus }

// M5 Learn mode (§19.6). A linear, low-pressure teaching walk. One unit = one pattern taught
// read+spell together: decode rule → a few read items → encode rule → a few spell items →
// mark LEARNED (participation-based; the per-item error-correction guarantees a correct final
// production, so there is no accuracy gate). No difficulty ramp, no timing, no SRS — that all
// lives in Test. Target = the first needs-review pattern (re-teach first), else the frontier.
// 4 read + 4 spell items (was 3): a little more guided exposure before a pattern is marked learned,
// so participation-based "learned" rests on more than a token number of reps (audit).
const READ_N = 4
const SPELL_N = 4
// Cumulative review (OG "constant review", §3): a unit OPENS with a quick read item from a
// previously-learned pattern before teaching the new one, so prior patterns are revisited during
// Learn (not only via Test's interleave). Skipped when nothing has been learned yet.
const REVIEW_N = 1
// Connected-text reading (§3 audit — OG lesson arc ends by reading decodable TEXT, not just words):
// after spelling, a Learn unit reads one decodable sentence (the T19 reading pack for the pattern),
// so the child transfers the pattern from isolated words to connected text within teaching.
const READTEXT_N = 1
// pattern (decode skill) → its connected-text reading skill (T19). Only patterns with enough letters
// to form sentences have one (CVC reading is gated at the last CVC sub-unit).
const READING_FOR: Record<string, string> = {
  'PH-cvc-4': 'RD-cvc-sentences', 'PH-digraphs': 'RD-digraph-sentences', 'PH-blends': 'RD-blend-sentences',
  'PH-silent-e': 'RD-silente-sentences', 'PH-vowel-teams-b': 'RD-vowelteam-sentences',
  'PH-r-controlled-b': 'RD-rcontrolled-sentences', 'PH-diphthongs-b': 'RD-diphthong-sentences',
  'PH-two-syllable': 'RD-twosyllable-sentences'
}
// Phonemic awareness (§3 audit): the CVC sub-units OPEN with a couple of oral blend/segment items
// (hear the sounds → blend; count the sounds) — the upstream skill a weak/dyslexic reader needs
// before grapheme work. Learn-only, participation-based; pulled from lib/pa (not a Test skill).
const PA_N = 2
type Phase = 'loading' | 'map' | 'pa' | 'review' | 'sound' | 'intro' | 'read' | 'spellIntro' | 'spell' | 'text' | 'done'
// A sound-intro card (§19.13): a NEW sound met for the first time, or a NEW spelling of a sound
// the child already knows ("same sound, new way to spell it").
type SoundCard = { kind: 'new' | 'spelling'; sound: Sound; graphemes: string[] }

export function LearnRunner(props: { child: Child; onExit: () => void; onSoundWall: () => void }) {
  const patternRef = useRef<SkillDef | null>(null)  // the next target (needs-review first, else frontier)
  const encodeRef = useRef<SkillDef | null>(null)
  const reviewSkillRef = useRef<SkillDef | null>(null) // a prior learned pattern to warm up on (§3 cumulative)
  const readingSkillRef = useRef<string | null>(null)  // this pattern's connected-text reading skill (§3)
  const learnedRef = useRef<Set<string>>(new Set())    // patterns learned so far (source for the review pick)
  const paPoolRef = useRef<PackItem[]>([])             // this unit's phonemic-awareness warm-up items (§3)
  const paIdxRef = useRef(0)
  const seenRef = useRef<Set<string>>(new Set())
  const soundsRef = useRef<SoundCard[]>([])         // this pattern's sound-intro cards (§19.13)
  const [soundIdx, setSoundIdx] = useState(0)
  const stepRef = useRef(0)
  const startedRef = useRef(false)
  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<PackItem | null>(null)
  const [answered, setAnswered] = useState(false)
  const [serve, setServe] = useState(0)
  const [mapRows, setMapRows] = useState<MapRow[]>([])

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void (async () => {
      const s = await getSettings(); setRate(s.ttsRate); setVoice(s.voiceURI)
      await openMap()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // A11y (§18.12): move focus to the screen on each Learn sub-phase so screen readers announce
  // the new step (map → rule → read → spell → done), mirroring App's per-view focus.
  useEffect(() => { (document.querySelector('main.screen') as HTMLElement | null)?.focus() }, [phase])

  // Auto-play the phoneme clip when a sound-intro card appears (§19.13.2).
  useEffect(() => { if (phase === 'sound') { const c = soundsRef.current[soundIdx]; if (c) phoneme(c.sound.id) } }, [phase, soundIdx])

  // Landing screen: compute every pattern's status + the next target (needs-review first, §19.3).
  async function openMap() {
    const rows = await getLearn(props.child.id)
    const prog = await getProgress(props.child.id)
    const masteredSkills = new Set(prog.filter(p => p.status === 'mastered').map(p => p.skillId))
    const learned = learnedSet(rows); const needs = needsReviewSet(rows)
    learnedRef.current = learned
    patternRef.current = PATTERNS.find(p => needs.has(p.id)) ?? nextToLearn(learned) ?? null
    setMapRows(PATTERNS.map(p => {
      const mastered = masteredSkills.has(p.id) && (!p.encodePairId || masteredSkills.has(p.encodePairId))
      return { id: p.id, label: p.iCanStatement.replace(/^I can /, ''), status: patternStatus(p.id, rows, mastered) }
    }))
    setPhase('map')
  }

  // Begin the target pattern's unit. §3 cumulative: OPEN with a quick review of a prior learned
  // pattern (if any), then §19.13 teach the pattern's new sound(s), then the read+spell flow.
  function startUnit() {
    const target = patternRef.current
    if (!target) { setPhase('map'); return }
    encodeRef.current = target.encodePairId ? getSkill(target.encodePairId) ?? null : null
    seenRef.current = new Set(); stepRef.current = 0
    const priors = PATTERNS.filter(p => learnedRef.current.has(p.id) && p.id !== target.id)
    reviewSkillRef.current = priors.length ? priors[Math.floor(Math.random() * priors.length)] : null
    // §3 audit: open a CVC unit with a phonemic-awareness warm-up (oral blend/segment) before
    // any grapheme work. Shuffle the PA pool and take PA_N.
    paPoolRef.current = [...paItemsFor(target.id)].sort(() => Math.random() - 0.5).slice(0, PA_N)
    paIdxRef.current = 0
    if (paPoolRef.current.length) loadPA()
    else startReviewOrSounds()
  }
  // After the PA warm-up: a cumulative review of a prior pattern (if any), else the sound-intro.
  function startReviewOrSounds() {
    if (reviewSkillRef.current) loadPractice(reviewSkillRef.current.id, 'review')
    else startSounds()
  }
  // Serve the current phonemic-awareness item (§3). PA items come straight from lib/pa (not a Test
  // skill), so they load directly rather than via pickItem.
  function loadPA() {
    const it = paPoolRef.current[paIdxRef.current]
    if (!it) { startReviewOrSounds(); return }
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setAnswered(false); setServe(s => s + 1); setPhase('pa')
  }
  // Build the pattern's sound-intro cards (§19.13) then enter the read+spell flow.
  function startSounds() {
    const target = patternRef.current!
    const graphemesAt = (s: Sound) => s.spellings.filter(sp => sp.pattern === target.id).map(sp => sp.grapheme)
    soundsRef.current = [
      ...newSoundsFor(target.id).map(s => ({ kind: 'new' as const, sound: s, graphemes: graphemesAt(s) })),
      ...newSpellingsFor(target.id).map(x => ({ kind: 'spelling' as const, sound: x.sound, graphemes: x.graphemes }))
    ]
    if (soundsRef.current.length) { setSoundIdx(0); setPhase('sound') } else setPhase('intro')
  }
  function nextSound() {
    if (soundIdx + 1 >= soundsRef.current.length) setPhase('intro')
    else setSoundIdx(i => i + 1)
  }

  function loadPractice(skillId: string, next: Phase) {
    const it = pickItem(skillId, 1, seenRef.current) // easiest items; low-pressure
    if (!it) { advanceAfterPractice(next); return }   // empty pool → skip the practice
    seenRef.current.add(it.id)
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setAnswered(false); setServe(s => s + 1); setPhase(next)
  }

  function beginRead() { stepRef.current = 0; loadPractice(patternRef.current!.id, 'read') }
  function beginSpell() {
    if (!encodeRef.current) { void finish(); return }
    stepRef.current = 0; loadPractice(encodeRef.current.id, 'spell')
  }
  // Called by Continue after an answered practice item, or when a pool is empty.
  function advanceAfterPractice(current: Phase) {
    if (current === 'pa') {
      paIdxRef.current += 1
      if (paIdxRef.current >= paPoolRef.current.length) { startReviewOrSounds(); return }
      loadPA()
      return
    }
    if (current === 'review') {
      stepRef.current += 1
      if (stepRef.current >= REVIEW_N) { stepRef.current = 0; startSounds(); return }
      loadPractice(reviewSkillRef.current!.id, 'review')
      return
    }
    if (current === 'read') {
      stepRef.current += 1
      if (stepRef.current >= READ_N) { setPhase('spellIntro'); return }
      loadPractice(patternRef.current!.id, 'read')
      return
    }
    if (current === 'spell') {
      stepRef.current += 1
      if (stepRef.current >= SPELL_N) { beginTextOrFinish(); return }
      loadPractice(encodeRef.current!.id, 'spell')
      return
    }
    // current === 'text': read one decodable sentence, then finish.
    stepRef.current += 1
    if (stepRef.current >= READTEXT_N) { void finish(); return }
    loadPractice(readingSkillRef.current!, 'text')
  }

  // After spelling: read a decodable sentence for the pattern (if it has a reading pack), else finish.
  function beginTextOrFinish() {
    const rd = READING_FOR[patternRef.current!.id]
    if (rd && getSkill(rd)) { readingSkillRef.current = rd; stepRef.current = 0; loadPractice(rd, 'text') }
    else void finish()
  }

  async function finish() {
    const id = patternRef.current!.id
    await setLearned(props.child.id, id)
    await clearReview(props.child.id, id)
    setPhase('done')
  }

  if (phase === 'loading') return <div className="stack center"><p className="note">Getting ready…</p></div>

  if (phase === 'map') return (
    <LearnMap name={props.child.name} rows={mapRows} hasTarget={!!patternRef.current}
      onStart={startUnit} onExit={props.onExit} onSoundWall={props.onSoundWall} />
  )

  if (phase === 'sound') {
    const c = soundsRef.current[soundIdx]
    if (!c) return null
    const play = () => phoneme(c.sound.id)
    const last = soundIdx + 1 >= soundsRef.current.length
    return (
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="link" onClick={props.onExit}>← Back</button>
          <span className="lesson-badge">🔊 Sound {soundIdx + 1} of {soundsRef.current.length}</span>
        </div>
        <div className="sound-card">
          <div className="sound-grapheme">{c.graphemes.length ? c.graphemes.join(' · ') : c.sound.id}</div>
          <button className="btn" onClick={play} aria-label="Hear the sound">🔊 Hear the sound</button>
          {c.kind === 'new' ? (
            <>
              <p className="stem">as in <button className="link" onClick={() => speak(c.sound.keyword)}>{c.sound.keyword} 🔊</button></p>
              <p className="note">{c.sound.articulation}</p>
              <p className="note">Now say it with me — tap 🔊 and copy the sound.</p>
            </>
          ) : (
            <p className="stem">You already know this sound (as in <b>{c.sound.keyword}</b>). Here's another way to spell it: <b>{c.graphemes.join(', ')}</b>.</p>
          )}
        </div>
        <button className="btn" onClick={nextSound}>{last ? "Let's read" : 'Next sound'}</button>
      </div>
    )
  }

  if (phase === 'intro') {
    const lesson = getLesson(patternRef.current!.id)
    if (lesson) return <LessonView lesson={lesson} onContinue={beginRead} />
    return <div className="stack center"><button className="btn" onClick={beginRead}>Start reading</button></div>
  }
  if (phase === 'spellIntro') {
    const lesson = encodeRef.current ? getLesson(encodeRef.current.id) : undefined
    if (lesson) return <LessonView lesson={lesson} onContinue={beginSpell} />
    return <div className="stack center"><button className="btn" onClick={beginSpell}>Start spelling</button></div>
  }

  if ((phase === 'pa' || phase === 'review' || phase === 'read' || phase === 'spell' || phase === 'text') && item) {
    const isTile = phase === 'spell'
    const badge = phase === 'pa' ? '🎧 listen to the sounds' : phase === 'review' ? '🔁 quick review'
      : phase === 'text' ? '📖 read the sentence' : isTile ? 'spell it' : 'read it'
    return (
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="link" onClick={props.onExit}>← Back</button>
          <span className="lesson-badge">📘 Learn · {badge}</span>
        </div>
        {isTile
          ? <TileItem key={serve} item={item} onAnswer={() => setAnswered(true)} />
          : <McqItem key={serve} item={item} onAnswer={() => setAnswered(true)} />}
        {answered && <button className="btn" onClick={() => advanceAfterPractice(phase)}>Continue</button>}
      </div>
    )
  }

  if (phase === 'done') return (
    <div className="stack center" aria-live="polite">
      <div className="cert">🌟</div>
      <h1>You learned it!</h1>
      <p className="stem">{patternRef.current!.iCanStatement}</p>
      <p className="note">Now try it in Test — or learn the next one.</p>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={() => { void openMap() }}>Learn the next one</button>
        <button className="btn ghost" onClick={props.onExit}>Done</button>
      </div>
    </div>
  )

  return null
}
