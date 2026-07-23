import { useEffect, useState } from 'react'
import type { Child, Attempt, SkillProgress, Certificate, Aggregate, Daily, Usage, Settings, LearnState } from '../types'
import { getAttempts, getProgress, getCertificates, getAggregates, getDaily, getUsage, getLearn, getSettings, putSettings, exportAll, importAll } from '../store'
import { SKILLS, getSkill } from '../lib/packs'
import { PATTERNS, learnedSet } from '../lib/learn'
import { computeReadiness, type Readiness } from '../lib/readiness'
import { achievements, type Achievement } from '../lib/gamify'
import { summarise, type Granularity } from '../lib/aggregate'
import { setRate, setVoice, listVoices, onVoicesReady } from '../lib/audio'
import { setSfxEnabled, setMusicEnabled, setCalm } from '../lib/audio-sfx'

// Parent dashboard (§10, §11, §14). PIN-gated, growth-framed, parent-only. Per-child readiness
// + action plan + weekly usage/streak + trend chart; global export/import backup.

type Gate = 'loading' | 'enter' | 'create1' | 'create2' | 'open'
interface CardData {
  child: Child; readiness: Readiness; usage?: Usage
  certs: Certificate[]; aggs: Aggregate[]; daily: Daily[]; entryLabel: string
  badges: Achievement[]
  learnedCount: number; masteredPatterns: number; totalPatterns: number  // M5 Learn/Test progress (§19.9 P3)
}
const GRANS: { id: Granularity; label: string }[] = [
  { id: 'day', label: 'Daily' }, { id: 'week', label: 'Weekly' }, { id: 'month', label: 'Monthly' }, { id: 'year', label: 'Yearly' }
]

const pct = (n: number) => `${Math.round(n * 100)}%`
const dot = (s: Readiness['status']) => s === 'On-Target' ? 'green' : s === 'Some-Risk' ? 'amber' : 'red'

function buildCard(child: Child, attempts: Attempt[], progress: SkillProgress[], certs: Certificate[], aggs: Aggregate[], daily: Daily[], learn: LearnState[], usage?: Usage): CardData {
  const mastered = new Set(progress.filter(p => p.status === 'mastered').map(p => p.skillId))
  const readiness = computeReadiness(attempts, mastered, aggs, SKILLS.length)
  const entry = child.entrySkillId ? getSkill(child.entrySkillId) : undefined
  const entryLabel = entry ? entry.iCanStatement : 'Not placed yet'
  const masteredPatterns = PATTERNS.filter(p => mastered.has(p.id) && (!p.encodePairId || mastered.has(p.encodePairId))).length
  return { child, readiness, usage, certs: certs.slice(-3).reverse(), aggs, daily, entryLabel, badges: achievements(attempts, certs, usage),
    learnedCount: learnedSet(learn).size, masteredPatterns, totalPatterns: PATTERNS.length }
}

export function ParentDashboard(props: { children: Child[]; onExit: () => void; onReset: (c: Child) => void; onRemove: (c: Child) => void | Promise<void> }) {
  const [gate, setGate] = useState<Gate>('loading')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [candidate, setCandidate] = useState('')
  const [error, setError] = useState(false)
  const [cards, setCards] = useState<CardData[]>([])
  const [voices, setVoices] = useState<{ voiceURI: string; name: string; lang: string }[]>([])
  const [tstat, setTstat] = useState('')
  const [gran, setGran] = useState<Granularity>('week')      // trend-chart granularity
  const [pickId, setPickId] = useState<string>('all')         // selected student in the dropdown ('all' = show every card)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null) // childId pending remove confirm

  // Remove a student + all their data (§14). Two-tap inline confirm (no native dialog, §18.12);
  // drop the card locally so the dashboard updates immediately.
  async function removeStudent(child: Child) {
    setConfirmRemove(null)
    await props.onRemove(child)
    setCards(prev => prev.filter(x => x.child.id !== child.id))
  }

  // Self-diagnosing TTS test: speaks synchronously in the click gesture and surfaces the
  // engine's own start/end/error events, so a silent device tells us *why* (not-allowed,
  // interrupted, synthesis-failed) instead of failing invisibly.
  function testVoice(voiceURI?: string) {
    try {
      const synth = window.speechSynthesis
      if (!synth) { setTstat('no speechSynthesis on this device'); return }
      if (synth.speaking || synth.pending) synth.cancel()
      if (synth.paused) synth.resume()
      const u = new SpeechSynthesisUtterance('Hello! Let us read together.')
      const v = synth.getVoices().find(x => x.voiceURI === voiceURI)
      if (v) { u.voice = v; u.lang = v.lang }
      u.rate = settings?.ttsRate ?? 0.4
      u.onstart = () => setTstat('▶ speaking…')
      u.onend = () => setTstat('✓ finished')
      u.onerror = e => setTstat('✗ ' + (e.error || 'error'))
      setVoice(voiceURI)
      synth.speak(u)
      setTstat('sent (' + synth.getVoices().length + ' voices)…')
    } catch (err) { setTstat('✗ ' + String(err)) }
  }

  useEffect(() => {
    void getSettings().then(s => { setSettings(s); setGate(s.pin ? 'enter' : 'create1') })
  }, [])

  // Load the device's installed English voices for the picker (async on many browsers).
  useEffect(() => {
    const refresh = () => setVoices(listVoices().map(v => ({ voiceURI: v.voiceURI, name: v.name, lang: v.lang })))
    refresh()
    return onVoicesReady(refresh)
  }, [])

  async function loadCards() {
    const data = await Promise.all(props.children.map(async c => {
      const [a, p, ce, ag, dy, ln, u] = await Promise.all([
        getAttempts(c.id), getProgress(c.id), getCertificates(c.id), getAggregates(c.id), getDaily(c.id), getLearn(c.id), getUsage(c.id)
      ])
      return buildCard(c, a, p, ce, ag, dy, ln, u)
    }))
    setCards(data)
  }
  useEffect(() => { if (gate === 'open') void loadCards() /* eslint-disable-next-line */ }, [gate])

  async function onPin(pin: string) {
    if (gate === 'enter') {
      if (settings?.pin === pin) { setError(false); setGate('open') } else setError(true)
    } else if (gate === 'create1') {
      setCandidate(pin); setError(false); setGate('create2')
    } else if (gate === 'create2') {
      if (pin === candidate) {
        const next: Settings = { ...(settings ?? { ttsRate: 0.4, englishVariant: 'en-SG', sessionLength: 16 }), pin }
        await putSettings(next); setSettings(next); setGate('open')
      } else { setError(true); setCandidate(''); setGate('create1') }
    }
  }

  async function updateSettings(patch: Partial<Settings>) {
    const next: Settings = { ...(settings ?? { ttsRate: 0.4, englishVariant: 'en-SG', sessionLength: 16 }), ...patch }
    setSettings(next); await putSettings(next)
    if (patch.font) document.documentElement.dataset.font = patch.font
    if (patch.ttsRate) setRate(patch.ttsRate)
    if ('voiceURI' in patch) setVoice(patch.voiceURI)
    if ('sfx' in patch) setSfxEnabled(patch.sfx ?? true)
    if ('music' in patch) setMusicEnabled(patch.music ?? false)
    if ('calmMode' in patch) { setCalm(patch.calmMode ?? false); if (patch.calmMode) document.documentElement.dataset.calm = 'on'; else delete document.documentElement.dataset.calm }
  }
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

  function download() {
    void exportAll().then(data => {
      const b = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(b)
      const a = document.createElement('a')
      a.href = url; a.download = `sg-reader-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
    })
  }
  function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    void file.text().then(t => {
      try {
        const data = JSON.parse(t)
        if (!data?.stores) throw new Error('bad file')
        void importAll(data).then(() => loadCards())
      } catch { setError(true) }
    })
  }

  if (gate === 'loading') return <div className="stack center"><p className="note">Loading…</p></div>
  if (gate !== 'open') {
    const title = gate === 'enter' ? 'Enter teacher PIN' : gate === 'create1' ? 'Create a teacher PIN' : 'Re-enter to confirm'
    return <PinPadGate title={title} error={error} onComplete={onPin} onCancel={props.onExit} />
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Teacher area</h1>
        <button className="link" onClick={props.onExit}>Done</button>
      </div>

      {cards.length === 0 && <p className="note">No students yet.</p>}

      {cards.length > 1 && (
        <label className="field">
          <span>Student</span>
          <select className="select" value={pickId} onChange={e => setPickId(e.target.value)}>
            <option value="all">All students</option>
            {cards.map(c => <option key={c.child.id} value={c.child.id}>{c.child.name}</option>)}
          </select>
        </label>
      )}

      {cards.filter(c => pickId === 'all' || c.child.id === pickId).map(c => (
        <div key={c.child.id} className="dash-card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>{c.child.name}</h2>
            <span className={'status-dot ' + dot(c.readiness.status)} aria-label={c.readiness.status}>● {c.readiness.status}</span>
          </div>
          <p className="note">School: P{c.child.pLevel} · Reading: {c.entryLabel}</p>
          {c.child.difficultyFlags?.length ? (
            <div className="chips">{c.child.difficultyFlags.map(f => <span key={f} className="chip">{f}</span>)}</div>
          ) : null}

          <div className="stat-row">
            <div className="stat"><b>{c.readiness.growth.mastered}</b><span>skills mastered</span></div>
            <div className="stat"><b>{c.readiness.growth.recentAccuracy === null ? '—' : pct(c.readiness.growth.recentAccuracy)}</b><span>recent accuracy</span></div>
            <div className="stat"><b>{c.readiness.growth.weeksActive}</b><span>weeks active</span></div>
          </div>

          <p className="note">📘 Learn: {c.learnedCount}/{c.totalPatterns} patterns learned · 🏆 {c.masteredPatterns} mastered</p>

          <p className="note">
            {c.usage ? `${c.usage.sessionsThisWeek} of ${c.usage.weeklySessionTarget} sessions this week` : '0 sessions this week'}
            {c.usage && c.usage.streakWeeks > 1 ? ` · ${c.usage.streakWeeks}-week streak 🔥` : ''}
          </p>
          {c.readiness.fluency.band !== 'n/a' && (
            <p className="note">
              Reading speed: {c.readiness.fluency.band === 'quick' ? '⚡ quick' : c.readiness.fluency.band === 'developing' ? '🕒 building' : '🐢 effortful'}
              {c.readiness.fluency.effortfulButAccurate ? ' — accurate but slow; practise for automaticity.' : ''}
            </p>
          )}

          {(() => {
            const buckets = summarise(c.aggs, c.daily, gran)
            return (
              <>
                <div className="seg" role="tablist" aria-label="Trend range">
                  {GRANS.map(g => (
                    <button key={g.id} role="tab" aria-selected={gran === g.id}
                      className={'seg-btn' + (gran === g.id ? ' on' : '')} onClick={() => setGran(g.id)}>{g.label}</button>
                  ))}
                </div>
                {buckets.length > 0 ? (
                  <div className="chart" aria-label={`${gran} activity`}>
                    {buckets.map(b => {
                      const max = Math.max(...buckets.map(x => x.items), 1)
                      return (
                        <div key={b.key} className="bar-wrap" title={`${b.label}: ${b.correct}/${b.items}`}>
                          <div className="bar" style={{ height: `${Math.max(6, (b.items / max) * 64)}px`, opacity: 0.4 + 0.6 * (b.items ? b.correct / b.items : 0) }} />
                          <span className="bar-lbl">{b.label}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : <p className="note tiny">No {gran === 'day' ? 'daily' : gran + 'ly'} activity yet.</p>}
              </>
            )
          })()}

          <div className="action">
            <b>Next step:</b> {c.readiness.action.text}
            {c.readiness.action.tags.length > 0 && (
              <div className="chips">{c.readiness.action.tags.map(t => <span key={t} className="chip">{t.replace(/-/g, ' ')}</span>)}</div>
            )}
          </div>

          {c.certs.length > 0 && (
            <div className="certs-list">
              <b>Recent certificates:</b>
              <ul>{c.certs.map(ce => <li key={ce.skillId + ce.awardedAt}>🏆 {ce.iCanStatement}</li>)}</ul>
            </div>
          )}

          <div className="badges" aria-label={`Badges: ${c.badges.filter(b => b.earned).length} of ${c.badges.length}`}>
            {c.badges.map(b => (
              <span key={b.id} className={'badge' + (b.earned ? ' on' : '')} title={b.label}>{b.icon}</span>
            ))}
            <span className="note tiny">{c.badges.filter(b => b.earned).length}/{c.badges.length} badges</span>
          </div>

          <p className="note tiny">{c.readiness.band} — a rough early guide, not a grade. Focus on the growth above.</p>
          {confirmRemove === c.child.id ? (
            <div className="stack" style={{ gap: 6 }}>
              <span className="note">Remove {c.child.name} and all their progress? This cannot be undone.</span>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn small danger" onClick={() => void removeStudent(c.child)}>Remove</button>
                <button className="btn small ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="row" style={{ gap: 6 }}>
              <button className="btn small ghost" onClick={() => props.onReset(c.child)}>Reset {c.child.name}</button>
              <button className="btn small danger" onClick={() => setConfirmRemove(c.child.id)}>Remove {c.child.name}</button>
            </div>
          )}
        </div>
      ))}

      <div className="dash-card">
        <b>Settings</b>
        {/* M6 (§20): sound effects, ambient music, and Calm Mode (dials animation + sound down). */}
        <div className="set-row">
          <span>Sound effects</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={'btn small' + ((settings?.sfx ?? true) ? '' : ' ghost')} onClick={() => updateSettings({ sfx: true })}>On</button>
            <button className={'btn small' + ((settings?.sfx ?? true) ? ' ghost' : '')} onClick={() => updateSettings({ sfx: false })}>Off</button>
          </div>
        </div>
        <div className="set-row">
          <span>Music</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={'btn small' + (settings?.music ? '' : ' ghost')} onClick={() => updateSettings({ music: true })}>On</button>
            <button className={'btn small' + (settings?.music ? ' ghost' : '')} onClick={() => updateSettings({ music: false })}>Off</button>
          </div>
        </div>
        <div className="set-row">
          <span>Calm mode</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={'btn small' + (settings?.calmMode ? '' : ' ghost')} onClick={() => updateSettings({ calmMode: true })}>On</button>
            <button className={'btn small' + (settings?.calmMode ? ' ghost' : '')} onClick={() => updateSettings({ calmMode: false })}>Off</button>
          </div>
        </div>
        <p className="note tiny">Calm mode reduces animation and sound for a gentler experience.</p>
        <div className="set-row">
          <span>Fluency Arcade</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={'btn small' + (settings?.arcade ? '' : ' ghost')} onClick={() => updateSettings({ arcade: true })}>On</button>
            <button className={'btn small' + (settings?.arcade ? ' ghost' : '')} onClick={() => updateSettings({ arcade: false })}>Off</button>
          </div>
        </div>
        <p className="note tiny">An optional timed speed game over mastered patterns — off by default; never part of lessons.</p>
        <div className="set-row">
          <span>Font</span>
          <div className="row" style={{ gap: 6 }}>
            <button className={'btn small' + ((settings?.font ?? 'lexend') === 'lexend' ? '' : ' ghost')} onClick={() => updateSettings({ font: 'lexend' })}>Lexend</button>
            <button className={'btn small' + (settings?.font === 'dyslexic' ? '' : ' ghost')} onClick={() => updateSettings({ font: 'dyslexic' })}>OpenDyslexic</button>
          </div>
        </div>
        <div className="set-row">
          <span>Voice speed</span>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <button className="btn small ghost" aria-label="Slower voice" onClick={() => updateSettings({ ttsRate: clamp(Number(((settings?.ttsRate ?? 0.4) - 0.2).toFixed(2)), 0.4, 1.6) })}>−</button>
            <span aria-live="polite">{(settings?.ttsRate ?? 0.4).toFixed(1)}×</span>
            <button className="btn small ghost" aria-label="Faster voice" onClick={() => updateSettings({ ttsRate: clamp(Number(((settings?.ttsRate ?? 0.4) + 0.2).toFixed(2)), 0.4, 1.6) })}>+</button>
          </div>
        </div>
        <p className="note tiny">On iPhone/iPad the built-in voice only partly changes speed — the setting applies from the next session.</p>
        {voices.length > 0 && (() => {
          const cur = Math.max(0, voices.findIndex(v => v.voiceURI === settings?.voiceURI))
          const step = (d: number) => {
            const next = voices[(cur + d + voices.length) % voices.length]
            void updateSettings({ voiceURI: next.voiceURI })
          }
          return (
            <div className="set-row">
              <span>Voice</span>
              <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                {voices.length > 1 && <button className="btn small ghost" aria-label="Previous voice" onClick={() => step(-1)}>◀</button>}
                <span aria-live="polite" style={{ minWidth: 96, textAlign: 'center' }}>{voices[cur]?.name ?? 'Default'}</span>
                {voices.length > 1 && <button className="btn small ghost" aria-label="Next voice" onClick={() => step(1)}>▶</button>}
                <button className="btn small" aria-label="Test voice" onClick={() => testVoice(voices[cur]?.voiceURI)}>🔊 Test</button>
                {tstat && <span aria-live="polite" style={{ fontSize: 13, opacity: 0.8 }}>{tstat}</span>}
              </div>
              {/^[▶✓]/.test(tstat) && (
                <p style={{ fontSize: 12, opacity: 0.75, margin: '4px 0 0' }}>
                  Reads as speaking but silent? On iPhone/iPad the spoken voice follows the
                  <b> ring/silent switch</b> — turn silent mode off and raise the ringer volume.
                  (Letter-sound clips use a different channel, so they play regardless.)
                </p>
              )}
            </div>
          )
        })()}
        <div className="set-row">
          <span>Session length</span>
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <button className="btn small ghost" aria-label="Shorter session" onClick={() => updateSettings({ sessionLength: clamp((settings?.sessionLength ?? 16) - 2, 8, 24) })}>−</button>
            <span aria-live="polite">{settings?.sessionLength ?? 16}</span>
            <button className="btn small ghost" aria-label="Longer session" onClick={() => updateSettings({ sessionLength: clamp((settings?.sessionLength ?? 16) + 2, 8, 24) })}>+</button>
          </div>
        </div>
      </div>

      <div className="dash-card">
        <b>Backup</b>
        <p className="note">Save progress to a file, or restore from one. Device storage can be cleared by the browser — export now and then.</p>
        <div className="row">
          <button className="btn ghost" onClick={download}>Export backup</button>
          <label className="btn ghost" style={{ textAlign: 'center' }}>
            Import backup
            <input type="file" accept="application/json" hidden onChange={onImportFile} />
          </label>
        </div>
      </div>
    </div>
  )
}

// Wrapper so the PIN pad remounts (clears digits) whenever the gate title changes.
import { PinPad } from './PinPad'
function PinPadGate(props: { title: string; error?: boolean; onComplete: (pin: string) => void; onCancel: () => void }) {
  return <PinPad key={props.title} {...props} />
}
