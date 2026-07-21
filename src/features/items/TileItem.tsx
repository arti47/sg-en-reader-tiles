import { useEffect, useMemo, useRef, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreTiles, type ScoreResult } from '../../lib/scoring'
import { speak } from '../../lib/audio'

// Directional mnemonic for the classic dyslexia letter reversals (§5). Shown only when the first
// wrong tile is exactly the mirror letter (b↔d, p↔q) — the single most iconic decoding error.
const REVERSAL: Record<string, string> = {
  b: "b: bat first (straight line down), then the ball on the right — think 'b' in bat.",
  d: "d: the ball first (on the left), then the bat — think 'd' in dog.",
  p: "p: straight line down, then the ball at the top on the right.",
  q: "q: the ball first, then the tail curling down — like in queen."
}
const MIRROR: Record<string, string> = { b: 'd', d: 'b', p: 'q', q: 'p' }
function reversalHint(expected: string | undefined, got: string | undefined): string | null {
  return expected && got && MIRROR[expected] === got ? REVERSAL[expected] : null
}

// build_word / spell_tiles: hear word → tap grapheme tiles into order (§6, §13 grapheme tiles).
// Error correction (§8, OG): a WRONG build is scored, then the correct word is REVEALED as a
// model and voiced, and the child must rebuild it correctly (errorless re-do) before continuing —
// so the last spelling they produce is the correct one. onAnswer fires with the first attempt.
export function TileItem(props: { item: PackItem; onAnswer: (r: ScoreResult, answer: string[]) => void }) {
  const { item } = props
  const target = item.graphemes ?? []
  const word = item.audioText ?? item.displayWord ?? target.join('')
  const tray = useMemo(() => {
    const tiles = [...(item.graphemes ?? []), ...(item.distractorGraphemes ?? [])]
      .map((g, i) => ({ key: `${g}-${i}`, g }))
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[tiles[i], tiles[j]] = [tiles[j], tiles[i]] }
    return tiles
  }, [item.id])
  const [built, setBuilt] = useState<{ key: string; g: string }[]>([])
  const [checked, setChecked] = useState<ScoreResult | null>(null)
  const [correcting, setCorrecting] = useState(false) // wrong build → rebuild the modelled word
  const [bdHint, setBdHint] = useState<string | null>(null) // b/d (p/q) reversal cue (§5)
  const firstRef = useRef<ScoreResult | null>(null)

  useEffect(() => { speak(word) }, [item.id])

  const used = new Set(built.map(b => b.key))

  function place(t: { key: string; g: string }) {
    if (checked || built.length >= target.length) return
    const next = [...built, t]
    setBuilt(next)
    // During correction the child copies the revealed model → auto-complete on an exact match.
    if (correcting && next.length === target.length && next.every((b, i) => b.g === target[i]) && firstRef.current) {
      setChecked(firstRef.current); props.onAnswer(firstRef.current, next.map(b => b.g))
    }
  }
  function undo() { if (!checked && !correcting) setBuilt(built.slice(0, -1)); else if (correcting) setBuilt(built.slice(0, -1)) }
  function check() {
    const r = scoreTiles(item, built.map(b => b.g))
    if (r.correct) { setChecked(r); props.onAnswer(r, built.map(b => b.g)); return }
    const answer = built.map(b => b.g)
    const firstBad = target.findIndex((g, i) => answer[i] !== g)
    setBdHint(firstBad >= 0 ? reversalHint(target[firstBad], answer[firstBad]) : null)
    firstRef.current = r; setCorrecting(true); setBuilt([]); speak(word) // reveal model + rebuild
  }

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="btn ghost" onClick={() => speak(word)} aria-label="Hear the word again">🔊 Hear it</button>
      </div>
      <p className="stem">{item.stem}</p>
      {correcting && !checked && (
        <div className="model-word" aria-label="Copy this spelling">{target.map((g, i) => <span key={i} className="model-tile">{g}</span>)}</div>
      )}
      <div className="slots" aria-label="Your word">
        {target.map((_, i) => (
          <span key={i} className={'slot' + (built[i] ? ' filled' : '') +
            (checked ? (built[i]?.g === target[i] ? ' correct' : ' wrong') : '')}>
            {built[i]?.g ?? ''}
          </span>
        ))}
      </div>
      {!checked && (
        <div className="tile-grid" aria-label="Letter tiles">
          {tray.map(t => (
            <button key={t.key} className="tile" disabled={used.has(t.key)} onClick={() => place(t)}>{t.g}</button>
          ))}
        </div>
      )}
      {correcting && !checked && bdHint && (
        <div className="feedback tip" aria-live="polite">↔ {bdHint}</div>
      )}
      {correcting && !checked && (
        <div className="feedback no" aria-live="polite">Not quite — build it again, like the model above. <button className="link" onClick={() => speak(word)} aria-label="Hear the word">🔊 hear it</button></div>
      )}
      {!checked && !correcting && (
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button>
          <button className="btn" onClick={check} disabled={built.length !== target.length}>Check</button>
        </div>
      )}
      {correcting && !checked && (
        <div className="row"><button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button></div>
      )}
      {checked && (
        <div className="feedback ok" aria-live="polite">
          {checked.correct ? 'Yes! ' : 'Good fixing! '}{item.rationale}
        </div>
      )}
    </div>
  )
}
