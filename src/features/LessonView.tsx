import type { Lesson } from '../types'
import { speak } from '../lib/audio'

// Explicit re-teaching, served on struggle (CLAUDE.md §8). Visually distinct.
export function LessonView(props: { lesson: Lesson; onContinue: () => void }) {
  const { lesson } = props
  return (
    <div className="stack lesson">
      <div className="lesson-badge">✨ Let's learn this</div>
      <h1>{lesson.iCanStatement}</h1>
      <p className="stem" style={{ fontWeight: 500 }}>{lesson.explanation}</p>
      <div className="stack">
        {lesson.workedExamples.map((e, i) => (
          <button key={i} className="example" onClick={() => speak(e.text)}>
            <span className="example-word">🔊 {e.text}</span>
            <span className="note">{e.note}</span>
          </button>
        ))}
      </div>
      <button className="btn" onClick={props.onContinue}>Let's try</button>
    </div>
  )
}
