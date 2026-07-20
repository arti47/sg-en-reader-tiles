import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, Attempt, SkillProgress, Difficulty, SkillDef, Certificate, Review } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { addAttempt, getAttempts, getProgress, putProgress, putCertificate, getReviews, putReview } from '../store'
import { SKILLS, getSkill, getLesson, pickItem } from '../lib/packs'
import { rollingAccuracy, itemsAnswered, nextDifficulty, isMastered, patternMastered, struggling, eligibleSkills, patternDecodeSkill, interleavedReviewSkill } from '../lib/engine'
import { scheduleFirst, onReviewPass, onReviewFail, dueReviews } from '../lib/srs'
import { McqItem } from './items/McqItem'
import { TileItem } from './items/TileItem'
import { LessonView } from './LessonView'

const SESSION_LEN = 16
type Phase = 'loading' | 'item' | 'lesson' | 'cert' | 'summary'

export function Session(props: { child: Child; onExit: () => void }) {
  const attemptsRef = useRef<Attempt[]>([])
  const diffRef = useRef<Map<string, Difficulty>>(new Map())
  const seenRef = useRef<Set<string>>(new Set())
  const lessonShownRef = useRef<Set<string>>(new Set())
  const masteredRef = useRef<Set<string>>(new Set()) // skills mastered at placement (§7)
  const startRef = useRef<number>(Date.now())
  const countRef = useRef(0)
  const reviewsRef = useRef<Review[]>([])       // spaced-repetition schedule (§7)
  const dueQueueRef = useRef<string[]>([])       // skillIds due for review this session (cap 4)
  const reviewingRef = useRef<string | null>(null) // skillId currently being reviewed, else null
  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<PackItem | null>(null)
  const [answered, setAnswered] = useState<ScoreResult | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [count, setCount] = useState(0)
  const [serve, setServe] = useState(0) // bumps every item served → forces renderer remount (fresh internal state)

  useEffect(() => {
    void (async () => {
      attemptsRef.current = await getAttempts(props.child.id)
      const prog = await getProgress(props.child.id)
      for (const p of prog) {
        diffRef.current.set(p.skillId, p.difficulty)
        if (p.status === 'mastered') masteredRef.current.add(p.skillId) // seed placement mastery
      }
      reviewsRef.current = await getReviews(props.child.id)
      dueQueueRef.current = dueReviews(reviewsRef.current, Date.now()).map(r => r.skillId)
      advance(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diffFor = (id: string): Difficulty => diffRef.current.get(id) ?? 1

  function loadItem(skill: SkillDef, forceDiff?: Difficulty) {
    const it = pickItem(skill.id, forceDiff ?? diffFor(skill.id), seenRef.current)
    if (!it) { setPhase('summary'); return }
    seenRef.current.add(it.id)
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setAnswered(null); setPhase('item'); setServe(s => s + 1); startRef.current = Date.now()
  }

  // Choose next skill (interleave eligible), then serve lesson-on-struggle or an item.
  function advance(initial = false) {
    if (!initial && countRef.current >= SESSION_LEN) { setPhase('summary'); return }
    // Due spaced-repetition reviews first (§7): easier items on already-mastered skills.
    const dueSkillId = dueQueueRef.current.shift()
    if (dueSkillId) {
      const rs = getSkill(dueSkillId)
      if (rs) { reviewingRef.current = dueSkillId; loadItem(rs, 1); return }
    }
    reviewingRef.current = null
    // Cumulative interleave (§7): every Nth item, slip in a quick review of a mastered skill.
    const review = interleavedReviewSkill(attemptsRef.current, countRef.current, masteredRef.current)
    if (review) { loadItem(review, 1); return } // normal attempt (not an SRS review)
    const elig = eligibleSkills(attemptsRef.current, masteredRef.current)
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
    const patternSkill = patternDecodeSkill(skill) // pattern identity = decode skill
    const wasPatternDone = patternMastered(attemptsRef.current, patternSkill, masteredRef.current)
    const a: Attempt = {
      id: crypto.randomUUID(), childId: props.child.id, skillId: item.skillId, itemId: item.id,
      correct: r.correct, difficulty: item.difficulty, missedConcept: r.missedConcept,
      latencyMs: Date.now() - startRef.current, ts: Date.now()
    }
    attemptsRef.current = [...attemptsRef.current, a]
    await addAttempt(a)

    const nd = nextDifficulty(attemptsRef.current, skill.id, diffFor(skill.id))
    diffRef.current.set(skill.id, nd)
    // Use placement-aware mastery so an interleaved review of a placement-mastered skill
    // (which has few/no attempts) never downgrades its persisted 'mastered' status (§7 A1).
    const nowMastered = isMastered(attemptsRef.current, skill, masteredRef.current)
    const sp: SkillProgress = {
      skillId: skill.id, status: nowMastered ? 'mastered' : 'active',
      itemsAnswered: itemsAnswered(attemptsRef.current, skill.id),
      rollingAccuracy: rollingAccuracy(attemptsRef.current, skill),
      difficulty: nd, lastSeen: Date.now(), masteredAt: nowMastered ? Date.now() : undefined
    }
    await putProgress(props.child.id, sp)

    countRef.current += 1; setCount(countRef.current)
    const now = Date.now()
    if (reviewingRef.current === skill.id) {
      // This was a spaced-repetition review: advance on pass, demote on fail (§7).
      const rev = reviewsRef.current.find(x => x.skillId === skill.id)
      if (rev) {
        const upd = r.correct ? onReviewPass(rev, now) : onReviewFail(rev, now)
        reviewsRef.current = reviewsRef.current.map(x => x.skillId === skill.id ? upd : x)
        await putReview(props.child.id, upd)
      }
    } else if (!wasPatternDone && patternMastered(attemptsRef.current, patternSkill, masteredRef.current)) {
      // Dual gate cleared (decode AND encode): award ONE pattern certificate + schedule its review (§7).
      const c: Certificate = { skillId: patternSkill.id, iCanStatement: patternSkill.iCanStatement, awardedAt: now }
      await putCertificate(props.child.id, c); setCert(c)
      const rev = scheduleFirst(patternSkill.id, now)
      reviewsRef.current = [...reviewsRef.current.filter(x => x.skillId !== patternSkill.id), rev]
      await putReview(props.child.id, rev)
    }
    setAnswered(r)
  }

  function onContinue() {
    if (cert) { setPhase('cert'); return }
    advance()
  }

  if (phase === 'loading') return <div className="stack center"><p className="note">Loading…</p></div>

  if (phase === 'summary') {
    const mastered = SKILLS.filter(s => isMastered(attemptsRef.current, s, masteredRef.current))
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
          ? <TileItem key={serve} item={item} onAnswer={onAnswer} />
          : <McqItem key={serve} item={item} onAnswer={onAnswer} />}
        {answered && <button className="btn" onClick={onContinue}>Continue</button>}
      </div>
    )
  }

  return null
}
