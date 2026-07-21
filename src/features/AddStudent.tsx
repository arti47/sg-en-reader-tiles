import { useState } from 'react'
import type { Child, DifficultyFlag } from '../types'

const FLAGS: { id: DifficultyFlag; label: string }[] = [
  { id: 'decoding', label: 'Decoding' },
  { id: 'fluency', label: 'Fluency' },
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'comprehension', label: 'Comprehension' },
  { id: 'dyslexia', label: 'Dyslexia' }
]

export function AddStudent(props: { onSave: (c: Child) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const [pLevel, setPLevel] = useState<1|2|3|4|5|6>(1)
  const [flags, setFlags] = useState<DifficultyFlag[]>([])
  const canSave = name.trim().length > 0
  const toggle = (f: DifficultyFlag) => setFlags(fs => fs.includes(f) ? fs.filter(x => x !== f) : [...fs, f])
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
      <div className="field">
        <span>Areas to watch <span className="note tiny">(optional)</span></span>
        <div className="level-row">
          {FLAGS.map(f => (
            <button key={f.id}
              className={'level-pill' + (flags.includes(f.id) ? ' on' : '')}
              aria-pressed={flags.includes(f.id)}
              onClick={() => toggle(f.id)}>{f.label}</button>
          ))}
        </div>
      </div>
      <div className="row">
        <button className="btn ghost" onClick={props.onCancel}>Cancel</button>
        <button className="btn" disabled={!canSave}
          onClick={() => props.onSave({ id: crypto.randomUUID(), name: name.trim(), pLevel, difficultyFlags: flags.length ? flags : undefined, createdAt: Date.now() })}>
          Save
        </button>
      </div>
      <p className="note">Reading placement runs on their first session — content follows reading level, not P-level.</p>
    </div>
  )
}
