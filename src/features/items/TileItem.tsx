import { useEffect, useMemo, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreTiles, type ScoreResult } from '../../lib/scoring'
import { speak } from '../../lib/audio'

// build_word / spell_tiles: hear word → tap grapheme tiles into order (§6, §13 grapheme tiles).
export function TileItem(props: { item: PackItem; onAnswer: (r: ScoreResult, answer: string[]) => void }) {
  const { item } = props
  const tray = useMemo(() => {
    const tiles = [...(item.graphemes ?? []), ...(item.distractorGraphemes ?? [])]
      .map((g, i) => ({ key: `${g}-${i}`, g }))
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[tiles[i], tiles[j]] = [tiles[j], tiles[i]] }
    return tiles
  }, [item.id])
  const [built, setBuilt] = useState<{ key: string; g: string }[]>([])
  const [checked, setChecked] = useState<ScoreResult | null>(null)
  const target = item.graphemes ?? []

  useEffect(() => { speak(item.audioText ?? item.displayWord ?? '') }, [item.id])

  const used = new Set(built.map(b => b.key))
  function place(t: { key: string; g: string }) { if (!checked && built.length < target.length) setBuilt([...built, t]) }
  function undo() { if (!checked) setBuilt(built.slice(0, -1)) }
  function check() {
    const answer = built.map(b => b.g)
    const r = scoreTiles(item, answer)
    setChecked(r); props.onAnswer(r, answer)
  }

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="btn ghost" onClick={() => speak(item.audioText ?? item.displayWord ?? '')} aria-label="Hear the word again">🔊 Hear it</button>
      </div>
      <p className="stem">{item.stem}</p>
      <div className="slots" aria-label="Your word">
        {target.map((_, i) => (
          <span key={i} className={'slot' + (built[i] ? ' filled' : '') +
            (checked ? (built[i]?.g === target[i] ? ' correct' : ' wrong') : '')}>
            {built[i]?.g ?? ''}
          </span>
        ))}
      </div>
      <div className="tile-grid" aria-label="Letter tiles">
        {tray.map(t => (
          <button key={t.key} className="tile" disabled={used.has(t.key) || !!checked} onClick={() => place(t)}>{t.g}</button>
        ))}
      </div>
      {!checked && (
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button>
          <button className="btn" onClick={check} disabled={built.length !== target.length}>Check</button>
        </div>
      )}
      {checked && (
        <div className={'feedback ' + (checked.correct ? 'ok' : 'no')} aria-live="polite">
          {checked.correct ? 'Yes! ' : 'Not yet. '}{item.rationale}
        </div>
      )}
    </div>
  )
}
