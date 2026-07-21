import { useState } from 'react'
import type { PackItem } from '../../types'
import { scoreCloze, type ScoreResult } from '../../lib/scoring'

// grammar_cloze (§6): passage + numbered blanks + a lettered word bank (each word used once).
// Tap a bank word to fill the next empty blank; tap a filled blank to clear it. Deterministic
// scoring against each blank's acceptable[] list. Touch-first, no keyboard (§13).
export function ClozeItem(props: { item: PackItem; onAnswer: (r: ScoreResult, answers: Record<string, string>) => void }) {
  const { item } = props
  const blanks = item.blanks ?? []
  const bank = item.wordBank ?? []
  const [filled, setFilled] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<ScoreResult | null>(null)

  const used = new Set(Object.values(filled))
  const nextEmpty = () => blanks.find(b => !filled[b.id])?.id
  function place(word: string) {
    if (checked || used.has(word)) return
    const id = nextEmpty(); if (!id) return
    setFilled(f => ({ ...f, [id]: word }))
  }
  function clear(id: string) { if (!checked) setFilled(f => { const n = { ...f }; delete n[id]; return n }) }
  function check() { const r = scoreCloze(item, filled); setChecked(r); props.onAnswer(r, filled) }

  const allFilled = blanks.every(b => filled[b.id])

  return (
    <div className="stack">
      <p className="passage">{item.passage}</p>
      <p className="stem">{item.stem}</p>
      <div className="slots" aria-label="Blanks">
        {blanks.map((b, i) => (
          <button key={b.id} className={'slot cloze-slot' + (filled[b.id] ? ' filled' : '') +
            (checked ? ((item.blanks![i].acceptable.map(x => x.toLowerCase()).includes((filled[b.id] ?? '').toLowerCase())) ? ' correct' : ' wrong') : '')}
            disabled={!!checked} onClick={() => clear(b.id)} aria-label={`Blank ${i + 1}`}>
            <span className="slot-num">{i + 1}</span>{filled[b.id] ?? '—'}
          </button>
        ))}
      </div>
      <div className="tile-grid" aria-label="Word bank">
        {bank.map(w => (
          <button key={w} className="tile word-tile" disabled={used.has(w) || !!checked} onClick={() => place(w)}>{w}</button>
        ))}
      </div>
      {!checked && (
        <button className="btn" onClick={check} disabled={!allFilled}>Check</button>
      )}
      {checked && (
        <div className={'feedback ' + (checked.correct ? 'ok' : 'no')} aria-live="polite">
          {checked.correct ? 'Yes! ' : 'Not yet. '}{item.rationale}
        </div>
      )}
    </div>
  )
}
