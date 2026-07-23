import { useEffect, useState } from 'react'
import type { Child, Equipped } from '../types'
import { level } from '../lib/gamify'
import { getInventory } from '../store'
import { Buddy } from './Buddy'

// Home screen (§14). Student management lives in the Teacher area. M6 (§20.2): tapping a child
// launches THEIR galaxy hub (which houses Learn / missions / trophies) — one big Play button.
// Each card shows the child's customised buddy (equipped cosmetics) so purchases are visible on
// the most-seen screen (§20.3).
export function ChildPicker(props: {
  children: Child[]
  xpByChild?: Record<string, number>
  onPick: (c: Child) => void   // → the child's galaxy hub
  onAdd: () => void
  onParent: () => void
}) {
  const [looks, setLooks] = useState<Record<string, Equipped>>({})
  useEffect(() => {
    let live = true
    void (async () => {
      const entries = await Promise.all(props.children.map(async c => [c.id, (await getInventory(c.id)).equipped] as const))
      if (live) setLooks(Object.fromEntries(entries))
    })()
    return () => { live = false }
  }, [props.children])

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Who's reading?</h1>
      </div>

      <div className="tile-grid">
        {props.children.map(c => (
          <div key={c.id} className="avatar">
            <span className="avatar-buddy" aria-hidden="true">
              <Buddy character={c.buddy?.character ?? 'robo'} state="idle" size={76} {...(looks[c.id] ?? {})} />
            </span>
            <span className="avatar-name">{c.name}</span>
            <span className="avatar-sub">P{c.pLevel}{props.xpByChild ? ` · ⭐ Lvl ${level(props.xpByChild[c.id] ?? 0)}` : ''}</span>

            <div className="stack" style={{ gap: 6 }}>
              <button className="btn small" onClick={() => props.onPick(c)}
                aria-label={`Play with ${c.name}`}>🚀 Play</button>
            </div>
          </div>
        ))}

        <button className="avatar avatar-add" onClick={props.onAdd}>
          <span className="avatar-letter">+</span>
          <span className="avatar-name">Add student</span>
        </button>
      </div>

      <button className="link" onClick={props.onParent} aria-label="Open the teacher area">🔒 Teacher area</button>
    </div>
  )
}
