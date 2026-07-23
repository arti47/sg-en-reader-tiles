import { useEffect, useState } from 'react'

// M6.4 §20.5 — a brief, skippable confetti burst for rewards (chest / daily goal / certificate).
// Respects reduced-motion / Calm Mode (renders nothing so nothing flashes). Never blocks input —
// it's an overlay with pointer-events: none and auto-clears.
const COLOURS = ['#f2b134', '#e05a7d', '#4f9de0', '#7ad04f', '#9b5fe0', '#ffd76a']
export function Celebration(props: { trigger: number }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!props.trigger) return
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.calm === 'on'
    if (still) return
    setOn(true); const t = setTimeout(() => setOn(false), 1300); return () => clearTimeout(t)
  }, [props.trigger])
  if (!on) return null
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 28 }).map((_, i) => (
        <span key={i} className="confetti-bit" style={{
          left: `${Math.random() * 100}%`, background: COLOURS[i % COLOURS.length],
          animationDelay: `${Math.random() * 0.3}s`, animationDuration: `${0.9 + Math.random() * 0.6}s`
        }} />
      ))}
    </div>
  )
}
