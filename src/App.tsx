import { useEffect, useState } from 'react'
import type { Child } from './types'
import { getChildren, addChild, removeChild, resetChild } from './store'
import { ChildPicker } from './features/ChildPicker'
import { AddStudent } from './features/AddStudent'
import { Session } from './features/Session'
import { Placement } from './features/Placement'
import { initPWA } from './pwa'
import * as srs from './lib/srs'

if (import.meta.env.DEV) (window as unknown as { __srs?: typeof srs }).__srs = srs

type View = 'pick' | 'add' | 'placement' | 'session'
const APP_VERSION = '0.2.14'

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
        {view === 'pick' && (
          <ChildPicker children={children}
            onPick={(c) => { setActive(c); setView('session') }}
            onAdd={() => setView('add')}
            onRemove={removeStudent}
            onReset={resetStudent} />
        )}
        {view === 'add' && <AddStudent onSave={save} onCancel={() => setView('pick')} />}
        {view === 'placement' && active && <Placement child={active} onDone={placementDone} />}
        {view === 'session' && active && <Session child={active} onExit={() => setView('pick')} />}
      </main>
      <footer className="ver">v{APP_VERSION}</footer>
    </div>
  )
}
