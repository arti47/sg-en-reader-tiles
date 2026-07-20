import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, Attempt, SkillProgress, Difficulty, SkillDef, Certificate } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { addAttempt, getAttempts, getProgress, putProgress, putCertificate } from '../store'
import { SKILLS, getSkill, getLesson, pickItem } from '../lib/packs'
import { rollingAccuracy, itemsAnswered, nextDifficulty, skillMastered, encodeUnlocked, struggling } from '../lib/engine'
import { McqItem } from './items/McqItem'
import { TileItem } from './items/TileItem'
import { LessonView } from './LessonView'

const SESSION_LEN = 16
type Phase = 'loading' | 'item' | 'lesson' | 'cert' | 'summary'

// Eligible skills: not yet mastered, prereqs met (encode partner unlocks at 70%, §7).
function eligibleSkills(attempts: Attempt[]): SkillDef[] {
  return SKILLS.filter(s => {
    if (skillMastered(attempts, s)) return false
    return s.prereqs.every(p => {
      const pre = getSkill(p); if (!pre) return false
      return s.encodePairId === p ? encodeUnlocked(attempts, pre) : skillMastered(attempts, pre)
    })
  })
}

export function Session(props: { child: Child; onExit: () => void }) {
  const attemptsRef = useRef<Attempt[]>([])
  const diffRef = useRef<Map<string, Difficulty>>(new Map())
  const seenRef = useRef<Set<string>>(new Set())
  const lessonShownRef = useRef<Set<string>>(new Set())
  const startRef = useRef<number>(Date.now())
  const countRef = useRef(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<PackItem | null>(null)
  const [answered, setAnswered] = useState<ScoreResult | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    void (async () => {
      attemptsRef.current = await getAttempts(props.child.id)
      const prog = await getProgress(props.child.id)
      for (const p of prog) diffRef.current.set(p.skillId, p.difficulty)
      advance(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diffFor = (id: string): Difficulty => diffRef.current.get(id) ?? 1

  function loadItem(skill: SkillDef) {
    const it = pickItem(skill.id, diffFor(skill.id), seenRef.current)
    if (!it) { setPhase('summary'); return }
    seenRef.current.add(it.id)
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setAnswered(null); setPhase('item'); startRef.current = Date.now()
  }

  // Choose next skill (interleave eligible), then serve lesson-on-struggle or an item.
  function advance(initial = false) {
    if (!initial && countRef.current >= SESSION_LEN) { setPhase('summary'); return }
    const elig = eligibleSkills(attemptsRef.current)
    if (!elig.length) { setPhase('summary'); return }
    const skill = elig[countRef.current % elig.length]
    if (struggling(attemptsRef.current, skill) && !lessonShownRef.current.has(skill.id) && getLesson(skill.id)) {
      lessonShownRef.current.add(skill.id)
      setItem({ skillId: skill.id } as PackItem) // carries skill id for lesson lookup
      setAnswered(null); setPhase('lesson'); return
    }
    loadItem(skill)
  }

  async function onAnswer(r: ScoreResult) {
    if (!item) return
    const skill = getSkill(item.skillId)!
    const wasMastered = skillMastered(attemptsRef.current, skill)
    const a: Attempt = {
      id: crypto.randomUUID(), childId: props.child.id, skillId: item.skillId, itemId: item.id,
      correct: r.correct, difficulty: item.difficulty, missedConcept: r.missedConcept,
      latencyMs: Date.now() - startRef.current, ts: Date.now()
    }
    attemptsRef.current = [...attemptsRef.current, a]
    await addAttempt(a)

    const nd = nextDifficulty(attemptsRef.current, skill.id, diffFor(skill.id))
    diffRef.current.set(skill.id, nd)
    const nowMastered = skillMastered(attemptsRef.current, skill)
    const sp: SkillProgress = {
      skillId: skill.id, status: nowMastered ? 'mastered' : 'active',
      itemsAnswered: itemsAnswered(attemptsRef.current, skill.id),
      rollingAccuracy: rollingAccuracy(attemptsRef.current, skill),
      difficulty: nd, lastSeen: Date.now(), masteredAt: nowMastered ? Date.now() : undefined
    }
    await putProgress(props.child.id, sp)

    countRef.current += 1; setCount(countRef.current)
    if (!wasMastered && nowMastered) {
      const c: Certificate = { skillId: skill.id, iCanStatement: skill.iCanStatement, awardedAt: Date.now() }
      await putCertificate(props.child.id, c); setCert(c)
    }
    setAnswered(r)
  }

  function onContinue() {
    if (cert) { setPhase('cert'); return }
    advance()
  }

  if (phase === 'loading') return <div className="stack center"><p className="note">Loading…</p></div>

  if (phase === 'summary') {
    const mastered = SKILLS.filter(s => skillMastered(attemptsRef.current, s))
    return (
      <div className="stack center">
        <div className="cert">🌟</div>
        <h1>Great session, {props.child.name}!</h1>
        <p className="note">{count} activities done{mastered.length ? ` · ${mastered.length} skill${mastered.length > 1 ? 's' : ''} mastered` : ''}.</p>
        <button className="btn" onClick={props.onExit}>Done</button>
      </div>
    )
  }

  if (phase === 'cert' && cert) {
    return (
      <div className="stack center">
        <div className="cert">🏆</div>
        <h1>Certificate earned!</h1>
        <p className="stem">{cert.iCanStatement}</p>
        <button className="btn" onClick={() => { setCert(null); advance() }}>Keep going</button>
      </div>
    )
  }

  if (phase === 'lesson' && item) {
    const lesson = getLesson(item.skillId)
    if (lesson) return <LessonView lesson={lesson} onContinue={() => loadItem(getSkill(item.skillId)!)} />
  }

  if (phase === 'item' && item) {
    const isTile = item.itemType === 'build_word' || item.itemType === 'spell_tiles'
    return (
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="link" onClick={props.onExit}>← Back</button>
          <span className="note">{Math.min(count + 1, SESSION_LEN)}/{SESSION_LEN}</span>
        </div>
        {isTile
          ? <TileItem key={item.id} item={item} onAnswer={onAnswer} />
          : <McqItem key={item.id} item={item} onAnswer={onAnswer} />}
        {answered && <button className="btn" onClick={onContinue}>Continue</button>}
      </div>
    )
  }

  return null
}
