import { useEffect, useRef, useState } from 'react'
import type { Child, PatternStatus } from '../types'
import { PATTERNS, nextToLearn, learnedSet, needsReviewSet, patternStatus } from '../lib/learn'
import { getLearn, getProgress, getWallet, getInventory, getDailyGoal } from '../store'
import { rollGoal } from '../lib/economy'
import { isoDay } from '../lib/aggregate'
import { startStarfield } from '../lib/starfield'
import { CoinCounter } from './CoinCounter'
import { Buddy } from './Buddy'
import { playSfx } from '../lib/audio-sfx'

// M6 §20.2 — the unified galaxy-map HUB. Each pattern is a planet; the child taps one to travel
// there. The active planet (needs-review, else the frontier) and every earlier one are tappable;
// later planets are locked. A planet that still needs teaching (not-started / learning /
// needs-review) routes to LEARN (the buddy teaches); a learned/mastered planet is a MISSION (Test).
// Reads only pedagogy state (learn store + progress) — it never writes it (engine frozen).
type Row = { id: string; label: string; status: PatternStatus; route: 'learn' | 'test' | 'locked' }
const ICON: Record<PatternStatus, string> = {
  'not-started': '🪐', 'learning': '🌗', 'learned': '🚀', 'mastered': '🏆', 'needs-review': '🛠️'
}

export function GalaxyMap(props: {
  child: Child
  onLearn: (patternId: string) => void
  onTest: () => void
  onTrophies: () => void
  onShop: () => void
  onExit: () => void
  onSoundWall: () => void
}) {
  const [rows, setRows] = useState<Row[]>([])
  const [targetIdx, setTargetIdx] = useState(-1)
  const [coins, setCoins] = useState(0)
  const [equipped, setEquipped] = useState<{ colour?: string; hat?: string }>({})
  const [goal, setGoal] = useState<{ progress: number; target: number; streak: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    void (async () => {
      const learnRows = await getLearn(props.child.id)
      const prog = await getProgress(props.child.id)
      const masteredSkills = new Set(prog.filter(p => p.status === 'mastered').map(p => p.skillId))
      const learned = learnedSet(learnRows); const needs = needsReviewSet(learnRows)
      const target = PATTERNS.find(p => needs.has(p.id)) ?? nextToLearn(learned) ?? null
      const ti = target ? PATTERNS.findIndex(p => p.id === target.id) : PATTERNS.length - 1
      setTargetIdx(ti)
      setRows(PATTERNS.map((p, i) => {
        const mastered = masteredSkills.has(p.id) && (!p.encodePairId || masteredSkills.has(p.encodePairId))
        const status = patternStatus(p.id, learnRows, mastered)
        const open = i <= ti
        const route: Row['route'] = !open ? 'locked'
          : (status === 'learned' || status === 'mastered') ? 'test' : 'learn'
        return { id: p.id, label: p.iCanStatement.replace(/^I can /, ''), status, route }
      }))
      setCoins((await getWallet(props.child.id)).coins)
      setEquipped((await getInventory(props.child.id)).equipped)
      const dg = rollGoal(await getDailyGoal(props.child.id), isoDay(Date.now()))
      setGoal({ progress: dg.progress, target: dg.target, streak: dg.streak })
      setLoading(false)
    })()
  }, [props.child.id])

  useEffect(() => { const c = canvasRef.current; if (!c) return; return startStarfield(c) }, [loading])

  if (loading) return <div className="stack center"><p className="note">Warming up the rockets…</p></div>
  const learnedCount = rows.filter(r => r.status === 'learned' || r.status === 'mastered').length

  function tap(r: Row) {
    if (r.route === 'locked') return
    playSfx('rocket')
    if (r.route === 'test') props.onTest(); else props.onLearn(r.id)
  }

  return (
    <div className="galaxy">
      <canvas ref={canvasRef} className="galaxy-stars" aria-hidden="true" />
      <div className="galaxy-inner stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="link" onClick={props.onExit}>← Back</button>
          <span className="row" style={{ gap: 8, alignItems: 'center' }}>
            <CoinCounter coins={coins} />
            <button className="btn ghost small" onClick={props.onShop} aria-label="Shop">🛍️</button>
            <button className="btn ghost small" onClick={props.onTrophies} aria-label="Trophies">🏆</button>
            <button className="btn ghost small" onClick={props.onSoundWall} aria-label="Sound wall">🔊</button>
          </span>
        </div>
        <div className="galaxy-buddy">
          <Buddy character={props.child.buddy?.character ?? 'robo'} state="idle" colour={equipped.colour} hat={equipped.hat} size={96} />
          <button className="btn ghost small" onClick={props.onShop}>✨ Customise</button>
        </div>
        <h1>{props.child.name}'s galaxy</h1>
        {goal && (
          <div className="daily-goal">
            <span className="note">Today's goal {goal.streak > 0 ? `· ${goal.streak}🔥` : ''}</span>
            <div className="goalbar"><div className="goalbar-fill" style={{ width: `${Math.min(100, Math.round((goal.progress / goal.target) * 100))}%` }} /></div>
          </div>
        )}
        <p className="note" role="status">{learnedCount} of {rows.length} planets explored. {targetIdx >= 0 && targetIdx < rows.length ? 'Tap your glowing planet!' : 'Whole galaxy explored! 🎉'}</p>
        <div className="planets" role="group" aria-label="Your planets — tap one to travel there">
          {rows.map((r, i) => {
            const active = i === targetIdx
            const cls = `planet planet-${r.route}` + (active ? ' planet-active' : '')
            const label = `${r.label} — ${r.route === 'locked' ? 'locked' : r.route === 'test' ? 'mission ready' : r.status === 'needs-review' ? 'needs practice' : 'new planet'}`
            return r.route === 'locked'
              ? <div key={r.id} className={cls} aria-label={label}><span className="planet-ico" aria-hidden="true">🔒</span><span className="planet-name">{r.label}</span></div>
              : <button key={r.id} className={cls} onClick={() => tap(r)} aria-label={label}>
                  <span className="planet-ico" aria-hidden="true">{ICON[r.status]}</span><span className="planet-name">{r.label}</span>
                </button>
          })}
        </div>
      </div>
    </div>
  )
}
