import type { Child } from '../types'
export function ChildPicker(props: {
  children: Child[]; onPick: (c: Child) => void; onAdd: () => void
}) {
  return (
    <div className="stack">
      <h1>Who's reading?</h1>
      <div className="tile-grid">
        {props.children.map(c => (
          <button key={c.id} className="avatar" onClick={() => props.onPick(c)}>
            <span className="avatar-letter">{c.name.charAt(0).toUpperCase()}</span>
            <span className="avatar-name">{c.name}</span>
            <span className="avatar-sub">P{c.pLevel}</span>
          </button>
        ))}
        <button className="avatar avatar-add" onClick={props.onAdd}>
          <span className="avatar-letter">+</span>
          <span className="avatar-name">Add student</span>
        </button>
      </div>
    </div>
  )
}
