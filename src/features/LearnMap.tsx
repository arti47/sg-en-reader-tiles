import type { PatternStatus } from '../types'

// M5 Learn map (§19.9 Phase 3) — the Learn landing. Every pattern is a ROW the child can TAP to
// open that lesson: the current active lesson (the target) and every earlier one are clickable
// (redo/continue); lessons AFTER the active one are locked until reached. No "Start learning"
// button — the rows are the entry points; the Sound wall lives in the header.
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
  targetId: string | null   // the current active lesson (frontier / needs-review); null = all learned
  onSelect: (patternId: string) => void
  onExit: () => void
  onSoundWall: () => void
}) {
  const learned = props.rows.filter(r => r.status === 'learned' || r.status === 'mastered').length
  // Rows up to and including the active lesson are unlocked; later ones are locked. When every
  // pattern is learned (no target), all rows are open.
  const targetIdx = props.targetId == null ? props.rows.length - 1 : props.rows.findIndex(r => r.id === props.targetId)
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="link" onClick={props.onExit}>← Back</button>
        <button className="btn ghost small" onClick={props.onSoundWall}>🔊 Sound wall</button>
      </div>
      <h1>{props.name}'s learning map</h1>
      <p className="note" role="status">{learned} of {props.rows.length} patterns learned. {props.targetId ? 'Tap a lesson to learn or practise it.' : 'You\'ve learned every pattern! 🎉'}</p>
      <div className="learn-map" role="group" aria-label="Your lessons — tap one to learn or practise it">
        {props.rows.map((r, i) => {
          const m = META[r.status]
          const open = i <= targetIdx
          const inner = (
            <>
              <span className="lm-icon" aria-hidden="true">{open ? m.icon : '🔒'}</span>
              <span className="lm-label">{r.label}</span>
              <span className="lm-status">{open ? m.label : 'Locked'}</span>
            </>
          )
          // Open rows are native <button>s (announced as buttons); locked rows are inert, non-focusable.
          return open
            ? <button key={r.id} className={'lm-row lm-open lm-' + m.cls} onClick={() => props.onSelect(r.id)}
                aria-label={`${r.label} — ${m.label}. Tap to learn or practise.`}>{inner}</button>
            : <div key={r.id} className="lm-row lm-locked" aria-label={`${r.label} — locked`}>{inner}</div>
        })}
      </div>
    </div>
  )
}
