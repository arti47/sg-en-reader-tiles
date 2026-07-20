import { useMemo, useState } from 'react'
import type { Child, PackItem } from '../types'
import { scoreMcq } from '../lib/scoring'
import { addAttempt } from '../store'
import pack from '../data/packs/grammar-L01-articles.json'

// M0 session: one item, prove the loop (present → answer → feedback → persist → done).
export function Session(props: { child: Child; onExit: () => void }) {
  const item = useMemo<PackItem>(() => (pack.items as PackItem[])[0], [])
  const [picked, setPicked] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const result = picked ? scoreMcq(item, picked) : null

  function choose(id: string) {
    if (picked) return
    setPicked(id)
    const r = scoreMcq(item, id)
    void addAttempt({ childId: props.child.id, skillId: item.skillId, itemId: item.id, correct: r.correct, ts: Date.now() })
  }

  if (done) {
    return (
      <div className="stack center">
        <div className="cert">⭐</div>
        <h1>Nice work, {props.child.name}!</h1>
        <p className="note">You finished today's warm-up.</p>
        <button className="btn" onClick={props.onExit}>Done</button>
      </div>
    )
  }

  return (
    <div className="stack">
      <button className="link" onClick={props.onExit}>← Back</button>
      <p className="stem">{item.stem}</p>
      <div className="tile-grid">
        {item.choices.map(c => {
          let cls = 'tile'
          if (picked) {
            if (c.id === item.correctChoiceId) cls += ' correct'
            else if (c.id === picked) cls += ' wrong'
          }
          return (
            <button key={c.id} className={cls} disabled={!!picked} onClick={() => choose(c.id)}>
              {c.label}
            </button>
          )
        })}
      </div>
      {result && (
        <div className={'feedback ' + (result.correct ? 'ok' : 'no')} aria-live="polite">
          {result.correct ? 'Yes! ' : 'Not yet. '}{item.rationale}
        </div>
      )}
      {picked && <button className="btn" onClick={() => setDone(true)}>Continue</button>}
    </div>
  )
}
