import { useEffect, useMemo, useRef, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreDictation, type ScoreResult } from '../../lib/scoring'
import { speak } from '../../lib/audio'

// dictation: hear a short decodable sentence → build it one word at a time from grapheme
// tiles (§6). Error correction (§8, OG): a wrong sentence is scored, then the correct sentence
// is revealed as a model and the child rebuilds the FIRST wrong word before continuing.
export function DictationItem(props: { item: PackItem; onAnswer: (r: ScoreResult) => void }) {
  const { item } = props
  const words = item.words ?? []
  const [wordIdx, setWordIdx] = useState(0)
  const [done, setDone] = useState<string[][]>([])
  const [built, setBuilt] = useState<{ key: string; g: string }[]>([])
  const [checked, setChecked] = useState<ScoreResult | null>(null)
  const [fixIdx, setFixIdx] = useState<number | null>(null) // index of the word being corrected, else null
  const firstRef = useRef<ScoreResult | null>(null)

  const correcting = fixIdx !== null
  const cur = correcting ? words[fixIdx] : words[wordIdx]
  const target = cur?.graphemes ?? []
  const tray = useMemo(() => {
    const tiles = [...(cur?.graphemes ?? []), ...(cur?.distractorGraphemes ?? [])].map((g, i) => ({ key: `${g}-${i}`, g }))
    for (let i = tiles.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[tiles[i], tiles[j]] = [tiles[j], tiles[i]] }
    return tiles
  }, [item.id, wordIdx, fixIdx])

  useEffect(() => { speak(item.audioText ?? '') }, [item.id])

  const used = new Set(built.map(b => b.key))
  const isLast = wordIdx === words.length - 1

  function place(t: { key: string; g: string }) {
    if (checked || built.length >= target.length) return
    const next = [...built, t]
    setBuilt(next)
    if (correcting && next.length === target.length && next.every((b, i) => b.g === target[i]) && firstRef.current) {
      setChecked(firstRef.current); props.onAnswer(firstRef.current) // errorless re-do complete
    }
  }
  const undo = () => { if (!checked) setBuilt(built.slice(0, -1)) }

  function nextWord() { setDone([...done, built.map(b => b.g)]); setBuilt([]); setWordIdx(wordIdx + 1) }
  function check() {
    const all = [...done, built.map(b => b.g)]
    const r = scoreDictation(item, all)
    if (r.correct) { setChecked(r); props.onAnswer(r); return }
    const firstWrong = words.findIndex((w, i) => (all[i] ?? []).join('') !== w.graphemes.join(''))
    firstRef.current = r; setFixIdx(firstWrong < 0 ? 0 : firstWrong); setBuilt([]); speak(item.audioText ?? '')
  }

  return (
    <div className="stack">
      <div className="row" style={{ alignItems: 'center' }}>
        <button className="btn ghost" onClick={() => speak(item.audioText ?? '')} aria-label="Hear the sentence again">🔊 Hear it</button>
        <span className="note">{correcting ? 'Fix this word' : `Word ${wordIdx + 1} of ${words.length}`}</span>
      </div>
      <p className="stem">{item.stem}</p>
      {correcting && (
        <div className="model-word" aria-label="Copy this word">{target.map((g, i) => <span key={i} className="model-tile">{g}</span>)}</div>
      )}
      <div className="dict-sentence" aria-label="Your sentence">
        {!correcting && done.map((w, i) => <span key={i} className="dict-word done">{w.join('')}</span>)}
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
      {!checked && !correcting && (
        <div className="row">
          <button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button>
          {isLast
            ? <button className="btn" onClick={check} disabled={built.length !== target.length}>Check</button>
            : <button className="btn" onClick={nextWord} disabled={built.length !== target.length}>Next word</button>}
        </div>
      )}
      {correcting && !checked && (
        <div className="row"><button className="btn ghost" onClick={undo} disabled={!built.length}>Undo</button></div>
      )}
      {correcting && !checked && (
        <div className="feedback no" aria-live="polite">Not quite — build this word like the model above.</div>
      )}
      {checked && (
        <div className="feedback ok" aria-live="polite">{checked.correct ? 'Yes! ' : 'Good fixing! '}{item.rationale}</div>
      )}
    </div>
  )
}
