import { useEffect, useState } from 'react'
import type { Child, Attempt, SkillProgress, Certificate, Aggregate, Usage, Settings } from '../types'
import { getAttempts, getProgress, getCertificates, getAggregates, getUsage, getSettings, putSettings, exportAll, importAll } from '../store'
import { SKILLS, getSkill } from '../lib/packs'
import { computeReadiness, type Readiness } from '../lib/readiness'
import { achievements, type Achievement } from '../lib/gamify'
import { setRate, setVoice, listVoices, onVoicesReady } from '../lib/audio'

// Parent dashboard (§10, §11, §14). PIN-gated, growth-framed, parent-only. Per-child readiness
// + action plan + weekly usage/streak + trend chart; global export/import backup.

type Gate = 'loading' | 'enter' | 'create1' | 'create2' | 'open'
interface CardData {
  child: Child; readiness: Readiness; usage?: Usage
  certs: Certificate[]; weeks: { week: string; items: number; correct: number }[]; entryLabel: string
  badges: Achievement[]
}

const pct = (n: number) => `${Math.round(n * 100)}%`
const dot = (s: Readiness['status']) => s === 'On-Target' ? 'green' : s === 'Some-Risk' ? 'amber' : 'red'

function buildCard(child: Child, attempts: Attempt[], progress: SkillProgress[], certs: Certificate[], aggs: Aggregate[], usage?: Usage): CardData {
  const mastered = new Set(progress.filter(p => p.status === 'mastered').map(p => p.skillId))
  const readiness = computeReadiness(attempts, mastered, aggs, SKILLS.length)
  const byWeek = new Map<string, { items: number; correct: number }>()
  for (const a of aggs) {
    const w = byWeek.get(a.week) ?? { items: 0, correct: 0 }
    w.items += a.items; w.correct += a.correct; byWeek.set(a.week, w)
  }
  const weeks = [...byWeek.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-8).map(([week, v]) => ({ week, ...v }))
  const entry = child.entrySkillId ? getSkill(child.entrySkillId) : undefined
  const entryLabel = entry ? entry.iCanStatement : 'Not placed yet'
  return { child, readiness, usage, certs: certs.slice(-3).reverse(), weeks, entryLabel, badges: achievements(attempts, certs, usage) }
}

export function ParentDashboard(props: { children: Child[]; onExit: () => void; onReset: (c: Child) => void }) {
  const [gate, setGate] = useState<Gate>('loading')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [candidate, setCandidate] = useState('')
  const [error, setError] = useState(false)
  const [cards, setCards] = useState<CardData[]>([])
  const [voices, setVoices] = useState<{ voiceURI: string; name: string; lang: string }[]>([])
  const [tstat, setTstat] = useState('')

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
      u.rate = settings?.ttsRate ?? 0.9
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
      const [a, p, ce, ag, u] = await Promise.all([
        getAttempts(c.id), getProgress(c.id), getCertificates(c.id), getAggregates(c.id), getUsage(c.id)
      ])
      return buildCard(c, a, p, ce, ag, u)
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
        const next: Settings = { ...(settings ?? { ttsRate: 0.9, englishVariant: 'en-SG', sessionLength: 16 }), pin }
        await putSettings(next); setSettings(next); setGate('open')
      } else { setError(true); setCandidate(''); setGate('create1') }
    }
  }

  async function updateSettings(patch: Partial<Settings>) {
    const next: Settings = { ...(settings ?? { ttsRate: 0.9, englishVariant: 'en-SG', sessionLength: 16 }), ...patch }
    setSettings(next); await putSettings(next)
    if (patch.font) document.documentElement.dataset.font = patch.font
    if (patch.ttsRate) setRate(patch.ttsRate)
    if ('voiceURI' in patch) setVoice(patch.voiceURI)
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
    const title = gate === 'enter' ? 'Enter parent PIN' : gate === 'create1' ? 'Create a parent PIN' : 'Re-enter to confirm'
    return <PinPadGate title={title} error={error} onComplete={onPin} onCancel={props.onExit} />
  }

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Parent area</h1>
        <button className="link" onClick={props.onExit}>Done</button>
      </div>

      {cards.length === 0 && <p className="note">No students yet.</p>}

      {cards.map(c => (
        <div key={c.child.id} className="dash-card">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>{c.child.name}</h2>
            <span className={'status-dot ' + dot(c.readiness.status)} aria-label={c.readiness.status}>● {c.readiness.status}</span>
          </div>
          <p className="note">School: P{c.child.pLevel} · Reading: {c.entryLabel}</p>

          <div className="stat-row">
            <div className="stat"><b>{c.readiness.growth.mastered}</b><span>skills mastered</span></div>
            <div className="stat"><b>{pct(c.readiness.growth.recentAccuracy)}</b><span>recent accuracy</span></div>
            <div className="stat"><b>{c.readiness.growth.weeksActive}</b><span>weeks active</span></div>
          </div>

          <p className="note">
            {c.usage ? `${c.usage.sessionsThisWeek} of ${c.usage.weeklySessionTarget} sessions this week` : '0 sessions this week'}
            {c.usage && c.usage.streakWeeks > 1 ? ` · ${c.usage.streakWeeks}-week streak 🔥` : ''}
          </p>

          {c.weeks.length > 0 && (
            <div className="chart" aria-label="Weekly activity">
              {c.weeks.map(w => {
                const max = Math.max(...c.weeks.map(x => x.items), 1)
                return (
                  <div key={w.week} className="bar-wrap" title={`${w.week}: ${w.correct}/${w.items}`}>
                    <div className="bar" style={{ height: `${Math.max(6, (w.items / max) * 64)}px`, opacity: 0.4 + 0.6 * (w.items ? w.correct / w.items : 0) }} />
                    <span className="bar-lbl">{w.week.slice(-3)}</span>
                  </div>
                )
              })}
            </div>
          )}

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
          <button className="btn small ghost" onClick={() => props.onReset(c.child)}>Reset {c.child.name}</button>
        </div>
      ))}

      <div className="dash-card">
        <b>Settings</b>
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
            <button className="btn small ghost" aria-label="Slower voice" onClick={() => updateSettings({ ttsRate: clamp(Number(((settings?.ttsRate ?? 0.9) - 0.1).toFixed(2)), 0.5, 1.3) })}>−</button>
            <span aria-live="polite">{(settings?.ttsRate ?? 0.9).toFixed(1)}×</span>
            <button className="btn small ghost" aria-label="Faster voice" onClick={() => updateSettings({ ttsRate: clamp(Number(((settings?.ttsRate ?? 0.9) + 0.1).toFixed(2)), 0.5, 1.3) })}>+</button>
          </div>
        </div>
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
                <button className="btn small ghost" aria-label="Previous voice" onClick={() => step(-1)}>◀</button>
                <span aria-live="polite" style={{ minWidth: 96, textAlign: 'center' }}>{voices[cur]?.name ?? 'Default'}</span>
                <button className="btn small ghost" aria-label="Next voice" onClick={() => step(1)}>▶</button>
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
