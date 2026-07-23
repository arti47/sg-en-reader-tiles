import { useEffect, useState } from 'react'
import type { Child, Certificate, Equipped } from '../types'
import { getAttempts, getCertificates, getUsage, getInventory } from '../store'
import { xp as calcXp, level, toNextLevel, achievements, type Achievement } from '../lib/gamify'
import { Buddy } from './Buddy'

// Child-facing trophy room (§14). Celebratory, growth-only: level + XP bar, earned
// certificates ("I can…" statements), and the achievement badges (earned/locked). No
// readiness/AL band here — that stays parent-only.
export function Trophies(props: { child: Child; onExit: () => void; onSoundWall: () => void }) {
  const [loading, setLoading] = useState(true)
  const [totalXp, setTotalXp] = useState(0)
  const [certs, setCerts] = useState<Certificate[]>([])
  const [badges, setBadges] = useState<Achievement[]>([])
  const [look, setLook] = useState<Equipped>({})

  useEffect(() => {
    void (async () => {
      const [attempts, cs, usage, inv] = await Promise.all([
        getAttempts(props.child.id), getCertificates(props.child.id), getUsage(props.child.id), getInventory(props.child.id)
      ])
      setTotalXp(calcXp(attempts, cs))
      setCerts(cs.sort((a, b) => b.awardedAt - a.awardedAt))
      setBadges(achievements(attempts, cs, usage))
      setLook(inv.equipped)
      setLoading(false)
    })()
  }, [props.child.id])

  if (loading) return <div className="stack center"><p className="note">Loading…</p></div>

  const lvl = level(totalXp)
  const { intoLevel, span } = toNextLevel(totalXp)
  const earned = badges.filter(b => b.earned).length

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{props.child.name}'s trophies</h1>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost small" onClick={props.onSoundWall}>🔊 Sound wall</button>
          <button className="link" onClick={props.onExit}>Done</button>
        </div>
      </div>

      <div className="trophy-buddy"><Buddy character={props.child.buddy?.character ?? 'robo'} state="celebrate" size={150} {...look} /></div>

      <div className="trophy-level">
        <span className="trophy-lvl">⭐ Level {lvl}</span>
        <div className="xp-bar" aria-label={`${intoLevel} of ${span} XP to next level`}>
          <div className="xp-fill" style={{ width: `${Math.round((intoLevel / span) * 100)}%` }} />
        </div>
        <span className="note tiny">{totalXp} XP earned</span>
      </div>

      <h2 style={{ marginBottom: 4 }}>My badges</h2>
      <div className="badges big" aria-label={`Badges: ${earned} of ${badges.length}`}>
        {badges.map(b => (
          <div key={b.id} className={'badge-card' + (b.earned ? ' on' : '')}>
            <span className="badge-icon">{b.earned ? b.icon : '🔒'}</span>
            <span className="note tiny">{b.label}</span>
          </div>
        ))}
      </div>

      <h2 style={{ marginBottom: 4 }}>My certificates</h2>
      {certs.length === 0
        ? <p className="note">No certificates yet — keep playing to earn your first one! 🌟</p>
        : (
          <div className="stack" style={{ gap: 8 }}>
            {certs.map(c => (
              <div key={c.skillId + c.awardedAt} className="trophy-cert">
                <span className="trophy-cert-icon">🏆</span>
                <span className="stem">{c.iCanStatement}</span>
              </div>
            ))}
          </div>
        )}

      <button className="btn" onClick={props.onExit}>Back</button>
    </div>
  )
}
