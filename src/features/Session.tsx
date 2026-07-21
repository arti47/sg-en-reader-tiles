import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, Attempt, SkillProgress, Difficulty, SkillDef, Certificate, Review } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { addAttempt, getAttempts, getProgress, putProgress, putCertificate, getCertificates, getReviews, putReview, bumpAggregate, getUsage, putUsage, getSettings } from '../store'
import { setRate, setVoice } from '../lib/audio'
import { XP_PER_CORRECT, XP_PER_CERT, achievements, type Achievement } from '../lib/gamify'
import { SKILLS, getSkill, getLesson, pickItem } from '../lib/packs'
import { rollingAccuracy, itemsAnswered, nextDifficulty, isMastered, patternMastered, struggling, eligibleSkills, patternDecodeSkill, interleavedReviewSkill, threadedSkill } from '../lib/engine'
import { scheduleFirst, onReviewPass, onReviewFail, dueReviews } from '../lib/srs'
import { isoWeek, isConsecutiveWeek } from '../lib/aggregate'
import { McqItem } from './items/McqItem'
import { TileItem } from './items/TileItem'
import { ClozeItem } from './items/ClozeItem'
import { DictationItem } from './items/DictationItem'
import { LessonView } from './LessonView'

const DEFAULT_SESSION_LEN = 16
const LESSON_MAX = 2      // re-teach at most twice per skill per session (§8 #4)
const REFIRE_AFTER = 3    // …and only re-fire after ≥3 further attempts, if still struggling
const GUIDED_ITEMS = 3    // forced easier (difficulty-1) items right after a lesson (§8 guided practice)
type Phase = 'loading' | 'item' | 'lesson' | 'cert' | 'summary'

export function Session(props: { child: Child; onExit: () => void; onTrophies: () => void }) {
  const attemptsRef = useRef<Attempt[]>([])
  const diffRef = useRef<Map<string, Difficulty>>(new Map())
  const seenRef = useRef<Set<string>>(new Set())
  const lessonCountRef = useRef<Map<string, number>>(new Map())   // lessons shown per skill this session (§8, cap LESSON_MAX)
  const lessonAtRef = useRef<Map<string, number>>(new Map())      // itemsAnswered(skill) when its last lesson fired (re-fire gate)
  const guidedRef = useRef<{ id: string; left: number } | null>(null) // post-lesson guided-practice block (§8)
  const certsRef = useRef<Set<string>>(new Set())                 // skillIds already certified (retention-confirmed, §7)
  const masteredRef = useRef<Set<string>>(new Set()) // skills mastered at placement (§7)
  const startRef = useRef<number>(Date.now())
  const countRef = useRef(0)
  const reviewsRef = useRef<Review[]>([])       // spaced-repetition schedule (§7)
  const dueQueueRef = useRef<string[]>([])       // skillIds due for review this session (cap 4)
  const reviewingRef = useRef<string | null>(null) // skillId currently being reviewed, else null
  const lenRef = useRef(DEFAULT_SESSION_LEN)     // session length (from settings)
  const xpGainRef = useRef(0)                    // XP earned this session (§14 gamification)
  const startBadgesRef = useRef<Set<string>>(new Set()) // badge ids already earned at session start (§14 highlights)
  const usageRef = useRef<import('../types').Usage | undefined>(undefined)
  const sessionCertsRef = useRef<Certificate[]>([]) // certificates minted THIS session (shown on the summary)
  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<PackItem | null>(null)
  const [answered, setAnswered] = useState<ScoreResult | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [count, setCount] = useState(0)
  const [serve, setServe] = useState(0) // bumps every item served → forces renderer remount (fresh internal state)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return // guard React StrictMode double-invoke (would race two advance()s, e.g. dropping a due review)
    startedRef.current = true
    void (async () => {
      const settings = await getSettings()
      lenRef.current = settings.sessionLength || DEFAULT_SESSION_LEN
      setRate(settings.ttsRate)
      setVoice(settings.voiceURI)
      attemptsRef.current = await getAttempts(props.child.id)
      const prog = await getProgress(props.child.id)
      for (const p of prog) {
        diffRef.current.set(p.skillId, p.difficulty)
        if (p.status === 'mastered') masteredRef.current.add(p.skillId) // seed placement mastery
      }
      reviewsRef.current = await getReviews(props.child.id)
      for (const c of await getCertificates(props.child.id)) certsRef.current.add(c.skillId)
      dueQueueRef.current = dueReviews(reviewsRef.current, Date.now()).map(r => r.skillId)
      await countSession()
      usageRef.current = await getUsage(props.child.id)
      // Baseline of already-earned badges so the summary can highlight ones earned THIS session.
      startBadgesRef.current = new Set(achievements(attemptsRef.current, certsAsArray(), usageRef.current).filter(b => b.earned).map(b => b.id))
      advance(true)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const diffFor = (id: string): Difficulty => diffRef.current.get(id) ?? 1
  // Certificates as an array (length is all gamify.achievements needs) for badge computation.
  const certsAsArray = (): Certificate[] => [...certsRef.current].map(id => ({ skillId: id, iCanStatement: '', awardedAt: 0 }))

  // Fidelity mechanic (§14): count this session toward the weekly target; roll the streak
  // when a new ISO week starts (consecutive week → +1, gap → reset to 1).
  async function countSession() {
    const now = Date.now(); const wk = isoWeek(now)
    const u = await getUsage(props.child.id)
    if (!u) { await putUsage({ childId: props.child.id, weeklySessionTarget: 4, sessionsThisWeek: 1, weekKey: wk, streakWeeks: 1, lastSessionTs: now }); return }
    if (u.weekKey === wk) { await putUsage({ ...u, sessionsThisWeek: u.sessionsThisWeek + 1, lastSessionTs: now }); return }
    const streak = isConsecutiveWeek(u.weekKey, wk) ? u.streakWeeks + 1 : 1
    await putUsage({ ...u, weekKey: wk, sessionsThisWeek: 1, streakWeeks: streak, lastSessionTs: now })
  }

  function loadItem(skill: SkillDef, forceDiff?: Difficulty) {
    const it = pickItem(skill.id, forceDiff ?? diffFor(skill.id), seenRef.current)
    if (!it) { setPhase('summary'); return }
    seenRef.current.add(it.id)
    if (import.meta.env.DEV) (window as unknown as { __item?: PackItem }).__item = it
    setItem(it); setAnswered(null); setPhase('item'); setServe(s => s + 1); startRef.current = Date.now()
  }

  // Choose next skill (interleave eligible), then serve lesson-on-struggle or an item.
  function advance(initial = false) {
    if (!initial && countRef.current >= lenRef.current) { setPhase('summary'); return }
    // Guided practice after a lesson (§8): a short block of easier (difficulty-1) items on the
    // just-taught skill before returning to normal rotation, so a child who just failed isn't
    // dropped straight back into a harder item.
    if (guidedRef.current && guidedRef.current.left > 0) {
      const gs = getSkill(guidedRef.current.id)
      guidedRef.current.left -= 1
      if (guidedRef.current.left <= 0) guidedRef.current = null
      if (gs) { reviewingRef.current = null; loadItem(gs, 1); return }
    }
    // Due spaced-repetition reviews first (§7): easier items on already-mastered skills.
    const dueSkillId = dueQueueRef.current.shift()
    if (dueSkillId) {
      const rs = getSkill(dueSkillId)
      if (rs) { reviewingRef.current = dueSkillId; loadItem(rs, 1); return }
    }
    reviewingRef.current = null
    // High-frequency sight words threaded throughout (§5/§6d): every Nth item, regardless of level.
    const threaded = threadedSkill(countRef.current)
    if (threaded) { loadItem(threaded); return }
    // Cumulative interleave (§7): every Nth item, slip in a quick review of a mastered skill.
    const review = interleavedReviewSkill(attemptsRef.current, countRef.current, masteredRef.current)
    if (review) { loadItem(review, 1); return } // normal attempt (not an SRS review)
    const elig = eligibleSkills(attemptsRef.current, masteredRef.current)
    if (!elig.length) { setPhase('summary'); return }
    const skill = elig[countRef.current % elig.length]
    // Re-teach on struggle (§8): up to LESSON_MAX times per skill/session, re-firing only after
    // ≥REFIRE_AFTER further attempts if still struggling (so a child still failing gets a 2nd
    // explicit lesson, not just one — but the lesson doesn't repeat every item).
    const shown = lessonCountRef.current.get(skill.id) ?? 0
    const answeredSince = itemsAnswered(attemptsRef.current, skill.id) - (lessonAtRef.current.get(skill.id) ?? -Infinity)
    if (struggling(attemptsRef.current, skill) && getLesson(skill.id) &&
        shown < LESSON_MAX && (shown === 0 || answeredSince >= REFIRE_AFTER)) {
      lessonCountRef.current.set(skill.id, shown + 1)
      lessonAtRef.current.set(skill.id, itemsAnswered(attemptsRef.current, skill.id))
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
    // Weekly rollup for the trend chart (§11): items/correct/minutes per (child, week, skill).
    await bumpAggregate(props.child.id, skill.id, isoWeek(a.ts), r.correct, a.latencyMs / 60000)

    countRef.current += 1; setCount(countRef.current)
    if (r.correct) xpGainRef.current += XP_PER_CORRECT
    const now = Date.now()
    if (reviewingRef.current === skill.id) {
      // This was a spaced-repetition review: advance on pass, demote on fail (§7).
      const rev = reviewsRef.current.find(x => x.skillId === skill.id)
      if (rev) {
        const upd = r.correct ? onReviewPass(rev, now) : onReviewFail(rev, now)
        reviewsRef.current = reviewsRef.current.map(x => x.skillId === skill.id ? upd : x)
        await putReview(props.child.id, upd)
      }
      // Retention = mastery (§7 #1): the FIRST spaced-review pass CONFIRMS the pattern and awards
      // its certificate (withheld at acquisition). Retention proven, not just same-session accuracy.
      if (r.correct && !certsRef.current.has(patternSkill.id) &&
          patternMastered(attemptsRef.current, patternSkill, masteredRef.current)) {
        const c: Certificate = { skillId: patternSkill.id, iCanStatement: patternSkill.iCanStatement, awardedAt: now }
        await putCertificate(props.child.id, c); certsRef.current.add(patternSkill.id); setCert(c)
        sessionCertsRef.current = [...sessionCertsRef.current, c]
        xpGainRef.current += XP_PER_CERT
      }
    } else if (!wasPatternDone && patternMastered(attemptsRef.current, patternSkill, masteredRef.current)) {
      // Dual gate cleared (decode AND encode) → PROVISIONAL mastery: advance now (keeps momentum),
      // but WITHHOLD the certificate until the +2d review confirms retention (§7 #1). Schedule it.
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
    const newBadges: Achievement[] = achievements(attemptsRef.current, certsAsArray(), usageRef.current)
      .filter(b => b.earned && !startBadgesRef.current.has(b.id))
    const gotSomething = sessionCertsRef.current.length > 0 || newBadges.length > 0
    return (
      <div className="stack center">
        <div className="cert">🌟</div>
        <h1>Great session, {props.child.name}!</h1>
        <p className="stem">+{xpGainRef.current} XP</p>
        <p className="note">{count} activities done{mastered.length ? ` · ${mastered.length} skill${mastered.length > 1 ? 's' : ''} mastered` : ''}.</p>
        {gotSomething && (
          <div className="new-awards" aria-live="polite">
            <b>New this session!</b>
            {sessionCertsRef.current.map(c => (
              <div key={c.skillId} className="award-row">🏆 <span>{c.iCanStatement}</span></div>
            ))}
            {newBadges.map(b => (
              <div key={b.id} className="award-row">{b.icon} <span>{b.label}</span></div>
            ))}
          </div>
        )}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={props.onTrophies}>🏆 My trophies</button>
          <button className="btn" onClick={props.onExit}>Done</button>
        </div>
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
    if (lesson) return <LessonView lesson={lesson} onContinue={() => { guidedRef.current = { id: item.skillId, left: GUIDED_ITEMS }; advance() }} />
  }

  if (phase === 'item' && item) {
    const isTile = item.itemType === 'build_word' || item.itemType === 'spell_tiles'
    const isCloze = item.itemType === 'grammar_cloze'
    const isDictation = item.itemType === 'dictation'
    return (
      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="link" onClick={props.onExit}>← Back</button>
          <span className="note">{Math.min(count + 1, lenRef.current)}/{lenRef.current}</span>
        </div>
        {isTile ? <TileItem key={serve} item={item} onAnswer={onAnswer} />
          : isDictation ? <DictationItem key={serve} item={item} onAnswer={onAnswer} />
            : isCloze ? <ClozeItem key={serve} item={item} onAnswer={onAnswer} />
              : <McqItem key={serve} item={item} onAnswer={onAnswer} />}
        {answered && <button className="btn" onClick={onContinue}>Continue</button>}
      </div>
    )
  }

  return null
}
