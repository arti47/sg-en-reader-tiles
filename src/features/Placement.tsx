import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, SkillProgress } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { pickItem, getSkill } from '../lib/packs'
import { nextPlacement, priorSkillIds, MAX_ITEMS, type PlaceResult } from '../lib/placement'
import { addChild, putProgress } from '../store'
import { McqItem } from './items/McqItem'

// Warm-up placement walk (§7). Framed as a game, no right/wrong feedback, ends on
// an achievable item. Sets the child's entry skill and marks lower skills mastered.
export function Placement(props: { child: Child; onDone: () => void }) {
  const results = useRef<PlaceResult[]>([])
  const seen = useRef<Set<string>>(new Set())
  const [item, setItem] = useState<PackItem | null>(null)
  const [serve, setServe] = useState(0)
  const [count, setCount] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => { advance() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function advance() {
    const step = nextPlacement(results.current)
    if (step.done) { void finish(step.entrySkillId!); return }
    const it = pickItem(step.skillId!, 1, seen.current) // easiest items for a low-pressure warm-up
    if (!it) { void finish(step.skillId!); return }
    seen.current.add(it.id)
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setServe(s => s + 1); setCount(c => c + 1)
  }

  async function finish(entrySkillId: string) {
    setBusy(true)
    await addChild({ ...props.child, entrySkillId })
    const now = Date.now()
    for (const sid of priorSkillIds(entrySkillId)) {
      const skill = getSkill(sid)
      const p: SkillProgress = {
        skillId: sid, status: 'mastered',
        itemsAnswered: skill?.mastery.minItems ?? 8, rollingAccuracy: 1,
        difficulty: 1, lastSeen: now, masteredAt: now
      }
      await putProgress(props.child.id, p)
    }
    props.onDone()
  }

  function onAnswer(r: ScoreResult) {
    if (!item || busy) return
    results.current = [...results.current, { skillId: item.skillId, correct: r.correct }]
    advance()
  }

  if (!item) return <div className="stack center"><p className="note">Getting ready…</p></div>

  return (
    <div className="stack">
      <div className="lesson-badge">🎧 Warm-up</div>
      <p className="note">Let's hear a few words. Just tap the one you hear — no worries if you're not sure!</p>
      <div className="dots" aria-label={`Warm-up ${count} of about ${MAX_ITEMS}`}>
        {Array.from({ length: MAX_ITEMS }).map((_, i) => (
          <span key={i} className={'dot' + (i < count ? ' on' : '')} />
        ))}
      </div>
      <McqItem key={serve} item={item} quiet onAnswer={onAnswer} />
    </div>
  )
}
