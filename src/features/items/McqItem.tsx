import { useEffect, useRef, useState } from 'react'
import type { PackItem } from '../../types'
import { scoreMcq, type ScoreResult } from '../../lib/scoring'
import { speak, phoneme } from '../../lib/audio'

// grammar_mcq / decode_choice: tap a choice. decode_choice plays its prompt — an isolated
// phoneme clip (letter-sounds, T01) when `phonemeId` is set, else the spoken word via TTS.
// `quiet` suppresses right/wrong styling + feedback + correction (used by the placement warm-up).
//
// Error correction (§8, OG): a WRONG first answer is scored (assessment) but does NOT end the
// item — the child must then tap the highlighted correct choice (which is also voiced) so the
// LAST thing they produce is correct, not the error. onAnswer fires with the FIRST attempt only
// once the correction is done, so the score is unaffected and Continue appears after fixing.
export function McqItem(props: { item: PackItem; quiet?: boolean; onAnswer: (r: ScoreResult, choiceId: string) => void }) {
  const { item } = props
  const [picked, setPicked] = useState<string | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const [corrected, setCorrected] = useState(false)
  const firstRef = useRef<{ r: ScoreResult; id: string } | null>(null)
  const isAudio = item.itemType === 'decode_choice'
  const playPrompt = () => { if (item.phonemeId) phoneme(item.phonemeId); else speak(item.audioText ?? '') }
  const correct = item.choices?.find(c => c.id === item.correctChoiceId)
  const modelCorrect = () => { if (item.phonemeId) phoneme(item.phonemeId); else speak(correct?.label ?? '') }

  useEffect(() => { if (isAudio) playPrompt() }, [item.id])

  function choose(id: string) {
    if (props.quiet) { setPicked(id); props.onAnswer(scoreMcq(item, id), id); return } // placement: assess-only
    if (correcting) {
      if (id === item.correctChoiceId && firstRef.current) {
        setCorrecting(false); setCorrected(true); setPicked(id)
        props.onAnswer(firstRef.current.r, firstRef.current.id) // record the FIRST attempt → Continue appears
      }
      return
    }
    if (picked) return
    const r = scoreMcq(item, id)
    setPicked(id)
    if (r.correct) { props.onAnswer(r, id) }
    else { firstRef.current = { r, id }; setCorrecting(true); modelCorrect() } // model + require the fix
  }

  const feedback = corrected ? { cls: 'ok', text: 'Good fixing! ' + item.rationale }
    : (picked && !correcting && !props.quiet) ? { cls: scoreMcq(item, picked).correct ? 'ok' : 'no', text: (scoreMcq(item, picked).correct ? 'Yes! ' : 'Not yet. ') + item.rationale }
      : null

  return (
    <div className="stack">
      {isAudio && (
        <div className="row">
          <button className="btn ghost" onClick={playPrompt} aria-label={item.phonemeId ? 'Hear the sound again' : 'Hear the word again'}>🔊 {item.phonemeId ? 'Hear the sound' : 'Hear it'}</button>
        </div>
      )}
      {item.passage && <p className="passage">{item.passage}</p>}
      {/* Connected-text reading (T19): a 🔊 support to hear the sentence read (passage + audioText, non-decode_choice). */}
      {item.passage && item.audioText && !isAudio && !props.quiet && (
        <div className="row"><button className="btn ghost" onClick={() => speak(item.audioText ?? '')} aria-label="Hear the sentence">🔊 Hear the sentence</button></div>
      )}
      <p className="stem">{item.stem}</p>
      {item.heart && !props.quiet && (
        <p className="heart-note">💛 Heart word — the tricky part to remember by heart is <b>{item.heart}</b>.</p>
      )}
      <div className="tile-grid">
        {(item.choices ?? []).map(c => {
          const isCorrect = c.id === item.correctChoiceId
          let cls = 'tile'
          if (!props.quiet) {
            if (correcting) { if (isCorrect) cls += ' correct' }
            else if (picked) { if (isCorrect) cls += ' correct'; else if (c.id === picked) cls += ' wrong' }
          }
          const disabled = props.quiet ? !!picked : correcting ? !isCorrect : !!picked
          return (
            <button key={c.id} className={cls} disabled={disabled} onClick={() => choose(c.id)}>
              {c.keyword
                ? <span className="tile-anchor"><span className="tile-letter">{c.label}</span><span className="tile-kw">{c.keyword}</span></span>
                : c.label}
            </button>
          )
        })}
      </div>
      {correcting && (
        <div className="feedback no" aria-live="polite">
          Not quite — now tap the right one. <button className="link" onClick={modelCorrect} aria-label="Hear the answer">🔊 hear it</button>
        </div>
      )}
      {feedback && <div className={'feedback ' + feedback.cls} aria-live="polite">{feedback.text}</div>}
    </div>
  )
}
