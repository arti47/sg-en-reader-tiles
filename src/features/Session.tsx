import { useEffect, useRef, useState } from 'react'
import type { Child, PackItem, Attempt, SkillProgress, Difficulty, SkillDef, Certificate, Review } from '../types'
import type { ScoreResult } from '../lib/scoring'
import { addAttempt, getAttempts, getProgress, putProgress, putCertificate, getCertificates, getReviews, putReview, bumpAggregate, bumpDaily, getUsage, putUsage, getSettings, getLearn, flagReview } from '../store'
import { setRate, setVoice } from '../lib/audio'
import { XP_PER_CORRECT, XP_PER_CERT, achievements, type Achievement } from '../lib/gamify'
import { SKILLS, getSkill, pickItem } from '../lib/packs'
import { rollingAccuracy, itemsAnswered, nextDifficulty, isMastered, patternMastered, struggling, eligibleSkills, patternDecodeSkill, interleavedReviewSkill, threadedSkill, fluencySkill } from '../lib/engine'
import { learnedSet } from '../lib/learn'
import { support } from '../lib/support'
import { scheduleFirst, onReviewPass, onReviewFail, dueReviews } from '../lib/srs'
import { isoWeek, isConsecutiveWeek, isoDay } from '../lib/aggregate'
import { McqItem } from './items/McqItem'
import { TileItem } from './items/TileItem'
import { ClozeItem } from './items/ClozeItem'
import { DictationItem } from './items/DictationItem'

const DEFAULT_SESSION_LEN = 16
const FOCUS_WIDTH = 3 // max distinct current-skills a session works at once (bounds high-placement fan-out)
// M5 Test mode (§19.7): assessment only. Teaching (intro + struggle lessons) has moved to Learn;
// on struggle Test flags the pattern for re-teaching (needs-review) instead of re-teaching.
type Phase = 'loading' | 'item' | 'cert' | 'summary' | 'learnfirst'

export function Session(props: { child: Child; onExit: () => void; onTrophies: () => void; onLearn: () => void }) {
  const attemptsRef = useRef<Attempt[]>([])
  const diffRef = useRef<Map<string, Difficulty>>(new Map())
  const seenRef = useRef<Set<string>>(new Set())
  const guidedRef = useRef<{ id: string; left: number } | null>(null) // re-practice block after a failed review (§7 #1)
  const learnedRef = useRef<Set<string>>(new Set()) // M5: patterns learned in Learn → the Test gate (§19.7)
  const certsRef = useRef<Set<string>>(new Set())                 // skillIds already certified (retention-confirmed, §7)
  const masteredRef = useRef<Set<string>>(new Set()) // skills mastered at placement (§7)
  const startRef = useRef<number>(Date.now())
  const countRef = useRef(0)
  const reviewsRef = useRef<Review[]>([])       // spaced-repetition schedule (§7)
  const dueQueueRef = useRef<string[]>([])       // skillIds due for review this session (cap 4)
  const reviewingRef = useRef<string | null>(null) // skillId currently being reviewed, else null
  const reviewServedRef = useRef(0)              // interleave+fluency items served this session (density cap)
  const lenRef = useRef(DEFAULT_SESSION_LEN)     // session length (from settings)
  const xpGainRef = useRef(0)                    // XP earned this session (§14 gamification)
  const startBadgesRef = useRef<Set<string>>(new Set()) // badge ids already earned at session start (§14 highlights)
  const usageRef = useRef<import('../types').Usage | undefined>(undefined)
  const sessionCertsRef = useRef<Certificate[]>([]) // certificates minted THIS session (shown on the summary)
  const flaggedPatternRef = useRef<SkillDef | null>(null) // a pattern struggled this session → offer Learn on the summary (§19.7)
  const [phase, setPhase] = useState<Phase>('loading')
  const [item, setItem] = useState<PackItem | null>(null)
  const [answered, setAnswered] = useState<ScoreResult | null>(null)
  const [cert, setCert] = useState<Certificate | null>(null)
  const [count, setCount] = useState(0)
  const [serve, setServe] = useState(0) // bumps every item served → forces renderer remount (fresh internal state)
  const startedRef = useRef(false)
  const sup = support(props.child.difficultyFlags) // §1 difficulty-flag personalisation (default = unchanged)
  const GUIDED_ITEMS = sup.guidedItems

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
      learnedRef.current = learnedSet(await getLearn(props.child.id)) // M5 Test gate (§19.7)
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

  const servedReviewRef = useRef(false) // was the current item a non-assessment rep (§ analytics)?
  function loadItem(skill: SkillDef, forceDiff?: Difficulty, review = false) {
    const it = pickItem(skill.id, forceDiff ?? diffFor(skill.id), seenRef.current)
    if (!it) { setPhase('summary'); return }
    seenRef.current.add(it.id)
    servedReviewRef.current = review
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
      if (gs) { reviewingRef.current = null; loadItem(gs, 1, true); return }
    }
    // Due spaced-repetition reviews first (§7): easier items on already-mastered skills.
    const dueSkillId = dueQueueRef.current.shift()
    if (dueSkillId) {
      const rs = getSkill(dueSkillId)
      if (rs) { reviewingRef.current = dueSkillId; loadItem(rs, 1, true); return }
    }
    reviewingRef.current = null
    // Massed practice first (§7): threading (sight words / letter-sounds) and interleaved review
    // only kick in once the child has acquired their first pattern — a raw beginner gets an
    // undiluted focus on the current skill; a placement-credited child is already past this.
    const hasMastery = masteredRef.current.size > 0 || SKILLS.some(s => isMastered(attemptsRef.current, s, masteredRef.current))
    if (hasMastery) {
      // High-frequency sight words threaded throughout (§5/§6d): every Nth item, regardless of level.
      const threaded = threadedSkill(countRef.current)
      if (threaded) { loadItem(threaded, undefined, true); return }
      // Cumulative interleave + fluency share a per-session cap so acquisition keeps the majority
      // of items (≤ ⌈len/3⌉ combined) even when several patterns are mastered and slow — otherwise
      // stacked review cadences could crowd out new learning for a max-support child (audit). Due
      // SRS reviews and the HF thread are exempt (retention-critical / core content).
      if (reviewServedRef.current < Math.ceil(lenRef.current / 3)) {
        // Cumulative interleave (§7): every Nth item, slip in a quick review of a mastered skill.
        const review = interleavedReviewSkill(attemptsRef.current, countRef.current, masteredRef.current, sup.interleaveEvery)
        if (review) { reviewServedRef.current += 1; loadItem(review, 1, true); return } // interleaved review rep
        // Fluency loop (§7): a mastered pattern read accurately but SLOWLY gets a quick speed rep.
        const fl = fluencySkill(attemptsRef.current, countRef.current, sup.fluencyMaxMs, masteredRef.current, sup.fluencyEvery)
        if (fl) { reviewServedRef.current += 1; loadItem(fl, 1, true); return }
      }
    }
    // M5 Test gate (§19.7): only assess patterns that have been LEARNED (in Learn mode). Non-pattern
    // skills (reading/M3/dictation/threaded) are not learned-gated.
    const elig = eligibleSkills(attemptsRef.current, masteredRef.current, learnedRef.current)
    if (!elig.length) { setPhase(learnedRef.current.size === 0 ? 'learnfirst' : 'summary'); return }
    // Concentrate the session on the lowest few unlocked skills instead of scattering across the
    // whole unlocked curriculum. A high placement can unlock many skills at once (M3 + dictation +
    // the held-back spelling rungs); round-robining all of them would stall mastery of any single
    // one. Focusing on a small frontier keeps acquisition brisk (and matches §7's massed-practice
    // intent). At a low placement few skills are eligible, so this is a no-op there.
    const focus = elig.slice(0, FOCUS_WIDTH)
    const skill = focus[countRef.current % focus.length]
    // Struggle → FLAG for re-teaching, don't teach (§19.7): teaching lives in Learn. Mark the
    // pattern needs-review so Learn resurfaces it, then drop to an easier prerequisite for
    // supported practice (down-shift, §7 #5); the per-item error-correction still applies.
    if (struggling(attemptsRef.current, skill)) {
      const pat = patternDecodeSkill(skill)
      void flagReview(props.child.id, pat.id)
      flaggedPatternRef.current = pat // surface a "learn it" route on the session summary (§19.7)
      const prereq = skill.prereqs.map(p => getSkill(p)).find(p => p && !p.threaded)
      if (prereq) { loadItem(prereq, 1, true); return } // down-shift = supported rep, not assessment
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
      latencyMs: Date.now() - startRef.current, ts: Date.now(),
      review: servedReviewRef.current || undefined // exclude reps from headline accuracy (§ analytics)
    }
    attemptsRef.current = [...attemptsRef.current, a]
    await addAttempt(a)

    const nd = nextDifficulty(attemptsRef.current, skill.id, diffFor(skill.id), sup.promoteStreak)
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
    await bumpDaily(props.child.id, isoDay(a.ts), r.correct, a.latencyMs / 60000)

    countRef.current += 1; setCount(countRef.current)
    if (r.correct) xpGainRef.current += XP_PER_CORRECT
    const now = Date.now()
    // The channels whose retention a pattern's certificate depends on: decode AND encode (§7 #2).
    const channelIds = patternSkill.encodePairId ? [patternSkill.id, patternSkill.encodePairId] : [patternSkill.id]
    if (reviewingRef.current === skill.id) {
      // Spaced-repetition review: advance on pass; on FAIL, demote to a short re-practice block —
      // easier (difficulty-1) items on the forgotten skill NOW, not just a re-test in 2 days (§7 #1).
      const rev = reviewsRef.current.find(x => x.skillId === skill.id)
      if (rev) {
        const upd = r.correct ? onReviewPass(rev, now) : onReviewFail(rev, now)
        reviewsRef.current = reviewsRef.current.map(x => x.skillId === skill.id ? upd : x)
        await putReview(props.child.id, upd)
      }
      if (!r.correct) guidedRef.current = { id: skill.id, left: GUIDED_ITEMS } // immediate re-practice
      // Retention = mastery (§7 #1/#2): the certificate (withheld at acquisition) is minted only once
      // BOTH channels have retained (each review stage ≥ 1 = ≥2 review items across the pattern), so
      // spelling retention is verified too, not just decoding.
      const bothRetained = channelIds.every(id => (reviewsRef.current.find(x => x.skillId === id)?.stage ?? 0) >= 1)
      if (r.correct && bothRetained && !certsRef.current.has(patternSkill.id) &&
          patternMastered(attemptsRef.current, patternSkill, masteredRef.current)) {
        const c: Certificate = { skillId: patternSkill.id, iCanStatement: patternSkill.iCanStatement, awardedAt: now }
        await putCertificate(props.child.id, c); certsRef.current.add(patternSkill.id); setCert(c)
        sessionCertsRef.current = [...sessionCertsRef.current, c]
        xpGainRef.current += XP_PER_CERT
      }
    } else if (!wasPatternDone && patternMastered(attemptsRef.current, patternSkill, masteredRef.current)) {
      // Dual gate cleared → PROVISIONAL mastery: advance now (keeps momentum), but WITHHOLD the
      // certificate until BOTH channels' +2d reviews confirm retention (§7 #1/#2). Schedule both.
      for (const sid of channelIds) {
        const rev = scheduleFirst(sid, now)
        reviewsRef.current = [...reviewsRef.current.filter(x => x.skillId !== sid), rev]
        await putReview(props.child.id, rev)
      }
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
        {flaggedPatternRef.current && (
          <p className="note">Tricky one today: <b>{flaggedPatternRef.current.iCanStatement.replace(/^I can /, '')}</b>. Learn it again to make it easier.</p>
        )}
        <div className="row" style={{ gap: 8 }}>
          {flaggedPatternRef.current && <button className="btn" onClick={props.onLearn}>📘 Learn it again</button>}
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

  if (phase === 'learnfirst') {
    return (
      <div className="stack center">
        <div className="cert">📘</div>
        <h1>Let's learn first, {props.child.name}!</h1>
        <p className="note">There's nothing to test yet. Learn a new pattern, then come back to Test it.</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" onClick={props.onLearn}>📘 Go to Learn</button>
          <button className="btn ghost" onClick={props.onExit}>Back</button>
        </div>
      </div>
    )
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
