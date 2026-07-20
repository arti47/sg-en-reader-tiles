import { useState } from 'react'
import type { Child } from '../types'

export function ChildPicker(props: {
  children: Child[]
  onPick: (c: Child) => void
  onAdd: () => void
  onRemove: (c: Child) => void
  onReset: (c: Child) => void
  onParent: () => void
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
              <span className="avatar-sub">P{c.pLevel}</span>

              {!editing && (
                <button className="btn small" onClick={() => props.onPick(c)}
                  aria-label={`Play with ${c.name}`}>Play</button>
              )}

              {editing && !conf && (
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn small ghost" onClick={() => setConfirm({ id: c.id, action: 'reset' })}>Reset</button>
                  <button className="btn small danger" onClick={() => setConfirm({ id: c.id, action: 'remove' })}>Remove</button>
                </div>
              )}

              {editing && conf && (
                <div className="stack" style={{ gap: 6 }}>
                  <span className="note">{conf === 'remove' ? `Remove ${c.name} and all progress?` : `Reset ${c.name}'s progress?`}</span>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn small ghost" onClick={() => setConfirm(null)}>Cancel</button>
                    <button className={'btn small' + (conf === 'remove' ? ' danger' : '')}
                      onClick={() => { setConfirm(null); setEditing(false); if (conf === 'remove') props.onRemove(c); else props.onReset(c) }}>
                      {conf === 'remove' ? 'Remove' : 'Reset'}
                    </button>
                  </div>
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
        <button className="link" onClick={props.onParent} aria-label="Open the parent area">🔒 Parent area</button>
      )}
    </div>
  )
}
