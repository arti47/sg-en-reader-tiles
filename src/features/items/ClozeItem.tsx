import { useRef, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreCloze, type ScoreResult } from '../../lib/scoring'

// grammar_cloze (§6): passage + numbered blanks + a lettered word bank (each word used once).
// Tap a bank word to fill the next empty blank; tap a filled blank to clear it. Error correction
// (§8, OG): a wrong answer is scored, then the wrong blanks are cleared and the child must place
// the correct word in each before continuing (the correct word is shown as a hint on the blank).
export function ClozeItem(props: { item: PackItem; onAnswer: (r: ScoreResult, answers: Record<string, string>) => void }) {
  const { item } = props
  const blanks = item.blanks ?? []
  const bank = item.wordBank ?? []
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<ScoreResult | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const firstRef = useRef<{ r: ScoreResult; answers: Record<string, string> } | null>(null)

  const okFor = (b: { id: string; acceptable: string[] }, w?: string) =>
    b.acceptable.map(x => x.toLowerCase()).includes((w ?? '').trim().toLowerCase())
  const used = new Set(Object.values(filled))
  const nextEmpty = () => blanks.find(b => !filled[b.id])?.id

  function place(word: string) {
    if (checked || used.has(word)) return
    const id = nextEmpty(); if (!id) return
    const next = { ...filled, [id]: word }
    setFilled(next)
    if (correcting && blanks.every(b => okFor(b, next[b.id])) && firstRef.current) {
      setChecked(firstRef.current.r); props.onAnswer(firstRef.current.r, firstRef.current.answers)
    }
  }
  function clear(id: string) { if (!checked) setFilled(f => { const n = { ...f }; delete n[id]; return n }) }
  function check() {
    const r = scoreCloze(item, filled)
    if (r.correct) { setChecked(r); props.onAnswer(r, filled); return }
    firstRef.current = { r, answers: { ...filled } }
    setFilled(f => Object.fromEntries(blanks.filter(b => okFor(b, f[b.id])).map(b => [b.id, f[b.id]]))) // keep only correct blanks
    setCorrecting(true)
  }

  const allFilled = blanks.every(b => filled[b.id])

  return (
    <div className="stack">
      <p className="passage">{item.passage}</p>
      <p className="stem">{item.stem}</p>
      <div className="slots" aria-label="Blanks">
        {blanks.map((b, i) => (
          <button key={b.id} className={'slot cloze-slot' + (filled[b.id] ? ' filled' : '') +
            (checked ? (okFor(item.blanks![i], filled[b.id]) ? ' correct' : ' wrong') : '')}
            disabled={!!checked} onClick={() => clear(b.id)} aria-label={`Blank ${i + 1}`}>
            <span className="slot-num">{i + 1}</span>{filled[b.id] ?? (correcting ? b.acceptable[0] : '—')}
          </button>
        ))}
      </div>
      <div className="tile-grid" aria-label="Word bank">
        {bank.map(w => (
          <button key={w} className="tile word-tile" disabled={used.has(w) || !!checked} onClick={() => place(w)}>{w}</button>
        ))}
      </div>
      {!checked && !correcting && (
        <button className="btn" onClick={check} disabled={!allFilled}>Check</button>
      )}
      {correcting && !checked && (
        <div className="feedback no" aria-live="polite">Not quite — put the right word in each blank (shown greyed in the blank).</div>
      )}
      {checked && (
        <div className="feedback ok" aria-live="polite">{checked.correct ? 'Yes! ' : 'Good fixing! '}{item.rationale}</div>
      )}
    </div>
  )
}
