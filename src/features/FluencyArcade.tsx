import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, SkillDef } from '../types'
import { SKILLS, pickItem } from '../lib/packs'
import { getProgress, addCoins } from '../store'
import { playSfx } from '../lib/audio-sfx'
import { McqItem } from './items/McqItem'

// M6.5 §20.6 — the OPT-IN Fluency Arcade (parent-enabled, default off). A light speed game over
// ALREADY-MASTERED decode patterns only — automaticity is a valid goal there, so timing is allowed
// here and ONLY here (never in core lessons). It never gates progress, records no attempts (pure
// game — the assessment engine is untouched), and awards a few cosmetic Star Coins for fun.
const GAME_SECONDS = 30
export function FluencyArcade(props: { child: Child; onExit: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'play' | 'done'>('loading')
  const skillsRef = useRef<SkillDef[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const [item, setItem] = useState<PackItem | null>(null)
  const [serve, setServe] = useState(0)
  const [score, setScore] = useState(0)
  const [left, setLeft] = useState(GAME_SECONDS)
  const [earned, setEarned] = useState(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    void (async () => {
      const prog = await getProgress(props.child.id)
      const mastered = new Set(prog.filter(p => p.status === 'mastered').map(p => p.skillId))
      skillsRef.current = SKILLS.filter(s => s.strand === 'phonics' && s.itemType === 'decode_choice' && mastered.has(s.id))
      setPhase('ready')
    })()
  }, [props.child.id])

  // Countdown while playing.
  useEffect(() => {
    if (phase !== 'play') return
    if (left <= 0) { void finish(); return }
    const t = setTimeout(() => setLeft(l => l - 1), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, left])

  function next() {
    const pool = skillsRef.current
    const sk = pool[Math.floor(Math.random() * pool.length)]
    const it = pickItem(sk.id, 1, seenRef.current)
    if (!it) { seenRef.current = new Set(); return next() }
    seenRef.current.add(it.id); setItem(it); setServe(s => s + 1)
  }
  function start() { scoreRef.current = 0; setScore(0); setLeft(GAME_SECONDS); setPhase('play'); next() }
  async function finish() {
    const coins = Math.min(60, scoreRef.current * 2)
    setEarned(coins); setPhase('done'); playSfx('chest')
    if (coins > 0) await addCoins(props.child.id, coins)
  }
  function onAnswer(correct: boolean) {
    if (correct) { scoreRef.current += 1; setScore(scoreRef.current); playSfx('coin') } else playSfx('wrong')
    next()
  }

  if (phase === 'loading') return <div className="stack center"><p className="note">Loading…</p></div>
  if (phase === 'ready') {
    const none = skillsRef.current.length === 0
    return (
      <div className="stack center">
        <div className="cert">⚡</div>
        <h1>Fluency Arcade</h1>
        {none
          ? <p className="note">Master some planets first, then come back to zap words for speed!</p>
          : <p className="note">Zap as many words as you can in {GAME_SECONDS} seconds! Just for fun — it doesn't change your learning.</p>}
        <div className="row" style={{ gap: 8 }}>
          {!none && <button className="btn" onClick={start}>⚡ Start</button>}
          <button className="btn ghost" onClick={props.onExit}>Back</button>
        </div>
      </div>
    )
  }
  if (phase === 'done') return (
    <div className="stack center" aria-live="polite">
      <div className="cert">🏁</div>
      <h1>Time's up!</h1>
      <p className="stem">You zapped {score} word{score === 1 ? '' : 's'}!</p>
      {earned > 0 && <p className="note">+{earned} Star Coins ⭐</p>}
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" onClick={start}>Play again</button>
        <button className="btn ghost" onClick={props.onExit}>Back</button>
      </div>
    </div>
  )
  // phase 'play'
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="note">⚡ {score}</span>
        <span className="note" aria-label={`${left} seconds left`}>⏱️ {left}s</span>
      </div>
      <div className="goalbar" aria-hidden="true"><div className="goalbar-fill" style={{ width: `${(left / GAME_SECONDS) * 100}%` }} /></div>
      {item && <McqItem key={serve} item={item} quiet onAnswer={(r) => onAnswer(r.correct)} />}
      <button className="link" onClick={props.onExit}>Stop</button>
    </div>
  )
}
