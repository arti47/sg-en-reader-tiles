import { useEffect, useState } from 'react'
import type { Child } from './types'
import { getChildren, addChild, removeChild, resetChild } from './store'
import * as store from './store'
import { ChildPicker } from './features/ChildPicker'
import { AddStudent } from './features/AddStudent'
import { Session } from './features/Session'
import { Placement } from './features/Placement'
import { ParentDashboard } from './features/ParentDashboard'
import { M3Demo } from './features/M3Demo'
import { initPWA } from './pwa'
import * as srs from './lib/srs'
import * as engine from './lib/engine'
import * as readiness from './lib/readiness'
import * as aggregate from './lib/aggregate'
import * as scoring from './lib/scoring'
import { getSkill } from './lib/packs'

if (import.meta.env.DEV) {
  const w = window as unknown as Record<string, unknown>
  w.__srs = srs; w.__engine = engine; w.__getSkill = getSkill
  w.__store = store; w.__readiness = readiness; w.__aggregate = aggregate; w.__scoring = scoring
}
const m3demo = import.meta.env.DEV && typeof location !== 'undefined' && location.hash === '#m3demo'

type View = 'pick' | 'add' | 'placement' | 'session' | 'dashboard'
const APP_VERSION = '0.2.19'

export default function App() {
  const [children, setChildren] = useState<Child[]>([])
  const [view, setView] = useState<View>('pick')
  const [active, setActive] = useState<Child | null>(null)
  const [reload, setReload] = useState<null | (() => void)>(null)

  useEffect(() => { void getChildren().then(setChildren) }, [])
  useEffect(() => { initPWA((r) => setReload(() => r)) }, [])

  async function save(c: Child) {
    await addChild(c); setActive(c); setView('placement') // run the warm-up placement next
  }
  async function placementDone() {
    setChildren(await getChildren()); setView('pick')
  }
  async function removeStudent(c: Child) {
    await removeChild(c.id); setChildren(await getChildren())
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
      <main className="screen">
        {m3demo && <M3Demo />}
        {!m3demo && view === 'pick' && (
          <ChildPicker children={children}
            onPick={(c) => { setActive(c); setView('session') }}
            onAdd={() => setView('add')}
            onRemove={removeStudent}
            onReset={resetStudent}
            onParent={() => setView('dashboard')} />
        )}
        {view === 'add' && <AddStudent onSave={save} onCancel={() => setView('pick')} />}
        {view === 'placement' && active && <Placement child={active} onDone={placementDone} />}
        {view === 'session' && active && <Session child={active} onExit={() => setView('pick')} />}
        {view === 'dashboard' && (
          <ParentDashboard children={children} onExit={() => setView('pick')} onReset={resetStudent} />
        )}
      </main>
      <footer className="ver">v{APP_VERSION}</footer>
    </div>
  )
}
