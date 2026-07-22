import { useEffect, useState } from 'react'
import type { Child } from '../types'
import { getLearn } from '../store'
import { learnedSet } from '../lib/learn'
import { introducedSounds, type Sound } from '../lib/sounds'
import { phoneme, speak } from '../lib/audio'

// M5.1 Sound wall (§19.13.6). Read-only, child-facing reference of every sound learned SO FAR
// (a sound appears once its first-taught pattern is learned). Tap a tile → play the clip; the
// panel shows the keyword + every spelling taught so far. No un-introduced sounds (no spoilers).
export function SoundWall(props: { child: Child; onExit: () => void }) {
  const [sounds, setSounds] = useState<Sound[]>([])
  const [loading, setLoading] = useState(true)
  const [sel, setSel] = useState<Sound | null>(null)

  useEffect(() => {
    void (async () => {
      const learned = learnedSet(await getLearn(props.child.id))
      setSounds(introducedSounds(learned))
      setLoading(false)
    })()
  }, [props.child.id])

  if (loading) return <div className="stack center"><p className="note">Loading…</p></div>

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="link" onClick={props.onExit}>← Back</button>
        <span className="lesson-badge">🔊 Sound wall</span>
      </div>
      <h1>{props.child.name}'s sounds</h1>
      {sounds.length === 0
        ? <p className="note">No sounds learned yet — start learning to fill your wall! 🌟</p>
        : (
          <>
            <p className="note">{sounds.length} sound{sounds.length > 1 ? 's' : ''} learned. Tap one to hear it.</p>
            <div className="sound-wall" aria-label="Sounds you have learned">
              {sounds.map(s => (
                <button key={s.id} className="sw-tile" onClick={() => { phoneme(s.id); setSel(s) }}
                  aria-label={`Hear the ${s.keyword} sound`}>
                  <span className="sw-grapheme">{s.spellings[0]?.grapheme ?? s.id}</span>
                  <span className="sw-kw">{s.keyword}</span>
                </button>
              ))}
            </div>
          </>
        )}
      {sel && (
        <div className="sound-card" aria-live="polite">
          <div className="sound-grapheme">{sel.spellings.map(sp => sp.grapheme).join(' · ') || sel.id}</div>
          <button className="btn" onClick={() => phoneme(sel.id)} aria-label="Hear the sound">🔊 Hear the sound</button>
          <p className="stem">as in <button className="link" onClick={() => speak(sel.keyword)}>{sel.keyword} 🔊</button></p>
          {sel.spellings.length > 1 && <p className="note">Spellings you've learned: <b>{sel.spellings.map(sp => sp.grapheme).join(', ')}</b></p>}
        </div>
      )}
    </div>
  )
}
