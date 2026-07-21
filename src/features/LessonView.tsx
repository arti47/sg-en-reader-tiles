import { useMemo } from 'react'
import type { Lesson } from '../types'
import { speak } from '../lib/audio'

// Explicit re-teaching, served on struggle (CLAUDE.md §8). Visually distinct.
export function LessonView(props: { lesson: Lesson; onContinue: () => void }) {
  const { lesson } = props
  // Show a rotating subset (max 3) so a lesson with many examples (e.g. letter-sounds) doesn't
  // always repeat the same two words. Lessons with ≤3 examples show them all (unchanged).
  const examples = useMemo(() => {
    const ex = lesson.workedExamples
    if (ex.length <= 3) return ex
    return [...ex].sort(() => Math.random() - 0.5).slice(0, 3)
  }, [lesson])
  return (
    <div className="stack lesson">
      <div className="lesson-badge">✨ Let's learn this</div>
      <h1>{lesson.iCanStatement}</h1>
      <p className="stem" style={{ fontWeight: 500 }}>{lesson.explanation}</p>
      <div className="stack">
        {examples.map((e, i) => (
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
