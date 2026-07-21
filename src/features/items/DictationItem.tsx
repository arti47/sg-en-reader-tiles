import { useEffect, useMemo, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreDictation, type ScoreResult } from '../../lib/scoring'
import { speak } from '../../lib/audio'

// dictation: hear a short decodable sentence → build it one word at a time from grapheme
// tiles (§6). Reuses the tile-slot pattern per word; scored per-word (all words must match).
export function DictationItem(props: { item: PackItem; onAnswer: (r: ScoreResult) => void }) {
  const { item } = props
  const words = item.words ?? []
  const [wordIdx, setWordIdx] = useState(0)
  const [done, setDone] = useState<string[][]>([])           // completed words' tiles
  const [built, setBuilt] = useState<{ key: string; g: string }[]>([]) // current word
  const [checked, setChecked] = useState<ScoreResult | null>(null)

  const cur = words[wordIdx]
  const target = cur?.graphemes ?? []
  const tray = useMemo(() => {
    const tiles = [...(cur?.graphemes ?? []), ...(cur?.distractorGraphemes ?? [])].map((g, i) => ({ key: `${g}-${i}`, g }))
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[tiles[i], tiles[j]] = [tiles[j], tiles[i]] }
    return tiles
  }, [item.id, wordIdx])

  useEffect(() => { speak(item.audioText ?? '') }, [item.id])

  const used = new Set(built.map(b => b.key))
  const place = (t: { key: string; g: string }) => { if (!checked && built.length < target.length) setBuilt([...built, t]) }
  const undo = () => { if (!checked) setBuilt(built.slice(0, -1)) }
  const isLast = wordIdx === words.length - 1

  function nextWord() {
    const all = [...done, built.map(b => b.g)]
    setDone(all); setBuilt([]); setWordIdx(wordIdx + 1)
  }
  function check() {
    const all = [...done, built.map(b => b.g)]
    const r = scoreDictation(item, all)
    setChecked(r); props.onAnswer(r)
  }

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="btn ghost" onClick={() => speak(item.audioText ?? '')} aria-label="Hear the sentence again">🔊 Hear it</button>
        <span className="note">Word {wordIdx + 1} of {words.length}</span>
      </div>
      <p className="stem">{item.stem}</p>
      <div className="dict-sentence" aria-label="Your sentence">
        {done.map((w, i) => <span key={i} className="dict-word done">{w.join('')}</span>)}
        <span className="dict-word current">
          {target.map((_, i) => (
            <span key={i} className={'slot' + (built[i] ? ' filled' : '') +
              (checked ? (built[i]?.g === target[i] ? ' correct' : ' wrong') : '')}>{built[i]?.g ?? ''}</span>
          ))}
        </span>
      </div>
      {!checked && (
        <div className="tile-grid" aria-label="Letter tiles">
          {tray.map(t => (
            <button key={t.key} className="tile" disabled={used.has(t.key)} onClick={() => place(t)}>{t.g}</button>
          ))}
        </div>
      )}
      {!checked && (
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button>
          {isLast
            ? <button className="btn" onClick={check} disabled={built.length !== target.length}>Check</button>
            : <button className="btn" onClick={nextWord} disabled={built.length !== target.length}>Next word</button>}
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
