import type { PatternStatus } from '../types'

// M5 Learn map (§19.9 Phase 3) — a read-only view of every pattern's status, shown as the Learn
// landing. Presentational: the parent (LearnRunner) supplies the rows + the next target.
const META: Record<PatternStatus, { icon: string; label: string; cls: string }> = {
  'not-started': { icon: '○', label: 'Not started', cls: 'ns' },
  'learning': { icon: '…', label: 'Learning', cls: 'lg' },
  'learned': { icon: '📘', label: 'Learned', cls: 'ld' },
  'mastered': { icon: '🏆', label: 'Mastered', cls: 'ms' },
  'needs-review': { icon: '🔁', label: 'Review', cls: 'nr' }
}

export function LearnMap(props: {
  name: string
  rows: { id: string; label: string; status: PatternStatus }[]
  hasTarget: boolean
  onStart: () => void
  onExit: () => void
}) {
  const learned = props.rows.filter(r => r.status === 'learned' || r.status === 'mastered').length
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="link" onClick={props.onExit}>← Back</button>
        <span className="lesson-badge">📘 Learn</span>
      </div>
      <h1>{props.name}'s learning map</h1>
      <p className="note">{learned} of {props.rows.length} patterns learned. {props.hasTarget ? 'Keep going!' : 'You\'ve learned every pattern! 🎉'}</p>
      <ul className="learn-map">
        {props.rows.map(r => {
          const m = META[r.status]
          return (
            <li key={r.id} className={'lm-row lm-' + m.cls}>
              <span className="lm-icon" aria-hidden="true">{m.icon}</span>
              <span className="lm-label">{r.label}</span>
              <span className="lm-status">{m.label}</span>
            </li>
          )
        })}
      </ul>
      {props.hasTarget
        ? <button className="btn" onClick={props.onStart}>Start learning</button>
        : <button className="btn" onClick={props.onExit}>Done</button>}
    </div>
  )
}
