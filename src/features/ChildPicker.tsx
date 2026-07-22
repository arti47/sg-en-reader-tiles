import { useState } from 'react'
import type { Child } from '../types'
import { level } from '../lib/gamify'

export function ChildPicker(props: {
  children: Child[]
  xpByChild?: Record<string, number>
  onPick: (c: Child) => void
  onLearn: (c: Child) => void
  onAdd: () => void
  onRemove: (c: Child) => void
  onReset: (c: Child) => void
  onParent: () => void
  onTrophies: (c: Child) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<{ id: string; action: 'remove' | 'reset' } | null>(null)

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Who's reading?</h1>
        {props.children.length > 0 && (
          <button className="link" onClick={() => { setEditing(e => !e); setConfirm(null) }}>
            {editing ? 'Done' : 'Manage'}
          </button>
        )}
      </div>

      <div className="tile-grid">
        {props.children.map(c => {
          const conf = confirm && confirm.id === c.id ? confirm.action : null
          return (
            <div key={c.id} className="avatar">
              <span className="avatar-letter">{c.name.charAt(0).toUpperCase()}</span>
              <span className="avatar-name">{c.name}</span>
              <span className="avatar-sub">P{c.pLevel}{props.xpByChild ? ` · ⭐ Lvl ${level(props.xpByChild[c.id] ?? 0)}` : ''}</span>

              {!editing && (
                <div className="stack" style={{ gap: 6 }}>
                  <button className="btn small" onClick={() => props.onLearn(c)}
                    aria-label={`Learn with ${c.name}`}>📘 Learn</button>
                  <button className="btn small" onClick={() => props.onPick(c)}
                    aria-label={`Test with ${c.name}`}>🎮 Test</button>
                  <button className="btn small ghost" onClick={() => props.onTrophies(c)}
                    aria-label={`${c.name}'s trophies`}>🏆 Trophies</button>
                </div>
              )}

              {editing && !conf && (
                <div className="stack" style={{ gap: 6 }}>
                  <button className="btn small ghost" onClick={() => setConfirm({ id: c.id, action: 'reset' })}>Reset</button>
                  <button className="btn small danger" onClick={() => setConfirm({ id: c.id, action: 'remove' })}>Remove</button>
                </div>
              )}

              {editing && conf && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="note">{conf === 'remove' ? `Remove ${c.name} and all progress?` : `Reset ${c.name}'s progress?`}</span>
                  <button className={'btn small' + (conf === 'remove' ? ' danger' : '')}
                    onClick={() => { setConfirm(null); setEditing(false); if (conf === 'remove') props.onRemove(c); else props.onReset(c) }}>
                    {conf === 'remove' ? 'Remove' : 'Reset'}
                  </button>
                  <button className="btn small ghost" onClick={() => setConfirm(null)}>Cancel</button>
                </div>
              )}
            </div>
          )
        })}

        {!editing && (
          <button className="avatar avatar-add" onClick={props.onAdd}>
            <span className="avatar-letter">+</span>
            <span className="avatar-name">Add student</span>
          </button>
        )}
      </div>

      {!editing && (
        <button className="link" onClick={props.onParent} aria-label="Open the teacher area">🔒 Teacher area</button>
      )}
    </div>
  )
}
