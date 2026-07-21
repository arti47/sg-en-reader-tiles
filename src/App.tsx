import { useEffect, useRef, useState } from 'react'
import type { Child } from './types'
import { getChildren, addChild, removeChild, resetChild, getSettings, getAttempts, getCertificates } from './store'
import * as store from './store'
import { xp as calcXp } from './lib/gamify'
import { ChildPicker } from './features/ChildPicker'
import { AddStudent } from './features/AddStudent'
import { Session } from './features/Session'
import { Placement } from './features/Placement'
import { Trophies } from './features/Trophies'
import { ParentDashboard } from './features/ParentDashboard'
import { M3Demo } from './features/M3Demo'
import { initPWA } from './pwa'
import { setVoice } from './lib/audio'
import * as srs from './lib/srs'
import * as engine from './lib/engine'
import * as readiness from './lib/readiness'
import * as aggregate from './lib/aggregate'
import * as scoring from './lib/scoring'
import * as gamify from './lib/gamify'
import { getSkill } from './lib/packs'

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>
  w.__srs = srs; w.__engine = engine; w.__getSkill = getSkill
  w.__store = store; w.__readiness = readiness; w.__aggregate = aggregate; w.__scoring = scoring; w.__gamify = gamify
}
const m3demo = import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#m3demo'

type View = 'pick' | 'add' | 'placement' | 'session' | 'dashboard' | 'trophies'
const APP_VERSION = __APP_VERSION__ // from package.json (§18.6), never hand-edited

export default function App() {
  const [children, setChildren] = useState<Child[]>([])
  const [view, setView] = useState<View>('pick')
  const [active, setActive] = useState<Child | null>(null)
  const [reload, setReload] = useState<null | (() => void)>(null)
  const [xpByChild, setXpByChild] = useState<Record<string, number>>({})

  async function refreshChildren() {
    const cs = await getChildren(); setChildren(cs)
    const entries = await Promise.all(cs.map(async c => [c.id, calcXp(await getAttempts(c.id), await getCertificates(c.id))] as const))
    setXpByChild(Object.fromEntries(entries))
  }
  useEffect(() => { void refreshChildren() }, [])
  useEffect(() => { initPWA((r) => setReload(() => r)) }, [])
  // Apply saved font (§14 dyslexia font, default Lexend) + chosen TTS voice app-wide.
  useEffect(() => { void getSettings().then(s => { document.documentElement.dataset.font = s.font ?? 'lexend'; setVoice(s.voiceURI) }) }, [])
  // A11y: move focus to the screen on each view change so screen readers announce it (§18.12).
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => { mainRef.current?.focus() }, [view])

  async function save(c: Child) {
    await addChild(c); setActive(c); setView('placement') // run the warm-up placement next
  }
  async function placementDone() {
    await refreshChildren(); setView('pick')
  }
  async function removeStudent(c: Child) {
    await removeChild(c.id); await refreshChildren()
  }
  async function resetStudent(c: Child) {
    await resetChild(c); setActive({ ...c, entrySkillId: undefined }); setView('placement')
  }

  return (
    <div className="app">
      {reload && (
        <div className="toast" role="status">
          Update available
          <button className="btn small" onClick={reload}>Refresh</button>
        </div>
      )}
      <main className="screen" ref={mainRef} tabIndex={-1}>
        {m3demo && <M3Demo />}
        {!m3demo && view === 'pick' && (
          <ChildPicker children={children}
            xpByChild={xpByChild}
            onPick={(c) => { setActive(c); setView('session') }}
            onAdd={() => setView('add')}
            onRemove={removeStudent}
            onReset={resetStudent}
            onTrophies={(c) => { setActive(c); setView('trophies') }}
            onParent={() => setView('dashboard')} />
        )}
        {view === 'add' && <AddStudent onSave={save} onCancel={() => setView('pick')} />}
        {view === 'placement' && active && <Placement child={active} onDone={placementDone} />}
        {view === 'trophies' && active && <Trophies child={active} onExit={() => { void refreshChildren(); setView('pick') }} />}
        {view === 'session' && active && (
          <Session child={active}
            onExit={() => { void refreshChildren(); setView('pick') }}
            onTrophies={() => setView('trophies')} />
        )}
        {view === 'dashboard' && (
          <ParentDashboard children={children} onExit={() => setView('pick')} onReset={resetStudent} />
        )}
      </main>
      <footer className="ver">v{APP_VERSION}</footer>
    </div>
  )
}
