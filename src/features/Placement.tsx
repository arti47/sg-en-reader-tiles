import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, SkillProgress } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { pickItem, getSkill } from '../lib/packs'
import { nextPlacement, priorSkillIds, decodeLadder, MIN_WARMUP, type PlaceResult } from '../lib/placement'
import { support } from '../lib/support'
import { addChild, putProgress, setLearned } from '../store'
import { McqItem } from './items/McqItem'

// Warm-up placement walk (§7). Framed as a game, no right/wrong feedback. The staircase finds
// the entry level; once decided, we top up with achievable items (from a level the child has
// already cleared) so the warm-up always runs at least MIN_WARMUP items and ends on an easy
// one — never an abrupt 2-item stop. Padding items don't affect the placement decision.
export function Placement(props: { child: Child; onDone: () => void }) {
  const results = useRef<PlaceResult[]>([])
  const seen = useRef<Set<string>>(new Set())
  const entryRef = useRef<string | null>(null) // decided entry level (null until the staircase finishes)
  const padRef = useRef(false)                  // is the current item warm-up padding (not scored)?
  const shownRef = useRef(0)                     // total items shown so far
  const [item, setItem] = useState<PackItem | null>(null)
  const [serve, setServe] = useState(0)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const started = useRef(false)
  const perSkill = support(props.child.difficultyFlags).placementPerSkill // §1: conservative for weaker readers

  // Guard against React StrictMode double-invoking the mount effect (which would advance
  // twice, discard the first item, and skew the warm-up count).
  useEffect(() => { if (started.current) return; started.current = true; advance() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function show(skillId: string, padding: boolean) {
    const it = pickItem(skillId, 1, seen.current) // easiest items for a low-pressure warm-up
    if (!it) { void finish(entryRef.current ?? skillId); return }
    seen.current.add(it.id)
    padRef.current = padding
    shownRef.current += 1
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setServe(s => s + 1)
  }

  function advance() {
    // Still finding the level.
    if (!entryRef.current) {
      const step = nextPlacement(results.current, perSkill)
      if (!step.done) { show(step.skillId!, false); return }
      entryRef.current = step.entrySkillId!
    }
    // Level decided → gentle warm-up padding to the minimum, ending on an achievable item.
    if (shownRef.current < MIN_WARMUP) {
      const idx = decodeLadder.findIndex(s => s.id === entryRef.current)
      const padSkill = decodeLadder[Math.max(0, idx - 1)].id // a level already cleared (or the floor)
      show(padSkill, true); return
    }
    void finish(entryRef.current)
  }

  async function finish(entrySkillId: string) {
    setBusy(true)
    await addChild({ ...props.child, entrySkillId })
    const now = Date.now()
    const prior = priorSkillIds(entrySkillId)
    for (const sid of prior) {
      const skill = getSkill(sid)
      const p: SkillProgress = {
        skillId: sid, status: 'mastered',
        itemsAnswered: skill?.mastery.minItems ?? 8, rollingAccuracy: 1,
        difficulty: 1, lastSeen: now, masteredAt: now
      }
      await putProgress(props.child.id, p)
    }
    // M5 (§19.8): a pattern is LEARNED at placement only when BOTH its decode and encode are
    // credited. The top-2 held-back encode rungs are decode-known but spelling-untaught, so their
    // patterns are NOT learned → they become the child's first Learn units.
    const priorSet = new Set(prior)
    for (const p of decodeLadder) {
      if (priorSet.has(p.id) && p.encodePairId && priorSet.has(p.encodePairId)) await setLearned(props.child.id, p.id)
    }
    setDone(true) // gentle end card instead of snapping back to the picker
  }

  function onAnswer(r: ScoreResult) {
    if (!item || busy) return
    if (!padRef.current) results.current = [...results.current, { skillId: item.skillId, correct: r.correct }]
    advance()
  }

  if (done) {
    return (
      <div className="stack center">
        <div className="cert">🌟</div>
        <h1>Nice warm-up, {props.child.name}!</h1>
        <p className="note">You're all set. Tap below to start reading.</p>
        <button className="btn" onClick={props.onDone}>Let's read</button>
      </div>
    )
  }

  if (!item) return <div className="stack center"><p className="note">Getting ready…</p></div>

  return (
    <div className="stack">
      <div className="lesson-badge">🎧 Warm-up</div>
      <p className="note">Let's hear a few words. Tap 🔊 to hear each one, then tap the word — no worries if you're not sure!</p>
      <McqItem key={serve} item={item} quiet onAnswer={onAnswer} />
    </div>
  )
}
