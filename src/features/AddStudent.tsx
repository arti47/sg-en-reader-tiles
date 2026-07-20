import { useState } from 'react'
import type { Child } from '../types'
export function AddStudent(props: { onSave: (c: Child) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [pLevel, setPLevel] = useState<1|2|3|4|5|6>(1)
  const canSave = name.trim().length > 0
  return (
    <div className="stack">
      <h1>Add student</h1>
      <label className="field">
        <span>Name</span>
        <input value={name} onChange={e => setName(e.target.value)} autoFocus />
      </label>
      <div className="field">
        <span>Primary level</span>
        <div className="level-row">
          {[1,2,3,4,5,6].map(n => (
            <button key={n}
              className={'level-pill' + (pLevel === n ? ' on' : '')}
              onClick={() => setPLevel(n as 1|2|3|4|5|6)}>P{n}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="btn ghost" onClick={props.onCancel}>Cancel</button>
        <button className="btn" disabled={!canSave}
          onClick={() => props.onSave({ id: crypto.randomUUID(), name: name.trim(), pLevel, createdAt: Date.now() })}>
          Save
        </button>
      </div>
      <p className="note">Reading placement runs on their first session — content follows reading level, not P-level.</p>
    </div>
  )
}
