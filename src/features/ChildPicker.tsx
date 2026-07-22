import type { Child } from '../types'
import { level } from '../lib/gamify'

// Home screen (§14). Student management (reset/remove) lives in the Teacher area, not here —
// the child picker is child-facing and only launches Learn / Test / Trophies.
export function ChildPicker(props: {
  children: Child[]
  xpByChild?: Record<string, number>
  onPick: (c: Child) => void
  onLearn: (c: Child) => void
  onAdd: () => void
  onParent: () => void
  onTrophies: (c: Child) => void
}) {
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Who's reading?</h1>
      </div>

      <div className="tile-grid">
        {props.children.map(c => (
          <div key={c.id} className="avatar">
            <span className="avatar-letter">{c.name.charAt(0).toUpperCase()}</span>
            <span className="avatar-name">{c.name}</span>
            <span className="avatar-sub">P{c.pLevel}{props.xpByChild ? ` · ⭐ Lvl ${level(props.xpByChild[c.id] ?? 0)}` : ''}</span>

            <div className="stack" style={{ gap: 6 }}>
              <button className="btn small" onClick={() => props.onLearn(c)}
                aria-label={`Learn with ${c.name}`}>📘 Learn</button>
              <button className="btn small" onClick={() => props.onPick(c)}
                aria-label={`Test with ${c.name}`}>🎮 Test</button>
              <button className="btn small ghost" onClick={() => props.onTrophies(c)}
                aria-label={`${c.name}'s trophies`}>🏆 Trophies</button>
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
