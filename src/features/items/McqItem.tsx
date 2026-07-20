import { useEffect, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreMcq, type ScoreResult } from '../../lib/scoring'
import { speak } from '../../lib/audio'

// grammar_mcq / decode_choice: tap a choice. decode_choice speaks the target word.
// `quiet` suppresses right/wrong styling + feedback (used by the placement warm-up).
export function McqItem(props: { item: PackItem; quiet?: boolean; onAnswer: (r: ScoreResult, choiceId: string) => void }) {
  const { item } = props
  const [picked, setPicked] = useState<string | null>(null)
  const isAudio = item.itemType === 'decode_choice'
  const result = picked ? scoreMcq(item, picked) : null

  useEffect(() => { if (isAudio) speak(item.audioText ?? '') }, [item.id])

  function choose(id: string) {
    if (picked) return
    setPicked(id)
    props.onAnswer(scoreMcq(item, id), id)
  }

  return (
    <div className="stack">
      {isAudio && (
        <div className="row">
          <button className="btn ghost" onClick={() => speak(item.audioText ?? '')} aria-label="Hear the word again">🔊 Hear it</button>
        </div>
      )}
      <p className="stem">{item.stem}</p>
      <div className="tile-grid">
        {(item.choices ?? []).map(c => {
          let cls = 'tile'
          if (picked && !props.quiet) {
            if (c.id === item.correctChoiceId) cls += ' correct'
            else if (c.id === picked) cls += ' wrong'
          }
          return (
            <button key={c.id} className={cls} disabled={!!picked} onClick={() => choose(c.id)}>{c.label}</button>
          )
        })}
      </div>
      {result && !props.quiet && (
        <div className={'feedback ' + (result.correct ? 'ok' : 'no')} aria-live="polite">
          {result.correct ? 'Yes! ' : 'Not yet. '}{item.rationale}
        </div>
      )}
    </div>
  )
}
