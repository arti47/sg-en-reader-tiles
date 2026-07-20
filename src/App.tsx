import { useEffect, useState } from 'react'
import type { Child } from './types'
import { getChildren, addChild } from './store'
import { ChildPicker } from './features/ChildPicker'
import { AddStudent } from './features/AddStudent'
import { Session } from './features/Session'
import { initPWA } from './pwa'

type View = 'pick' | 'add' | 'session'
const APP_VERSION = '0.2.11'

export default function App() {
  const [children, setChildren] = useState<Child[]>([])
  const [view, setView] = useState<View>('pick')
  const [active, setActive] = useState<Child | null>(null)
  const [reload, setReload] = useState<null | (() => void)>(null)

  useEffect(() => { void getChildren().then(setChildren) }, [])
  useEffect(() => { initPWA((r) => setReload(() => r)) }, [])

  async function save(c: Child) {
    await addChild(c); setChildren(await getChildren()); setView('pick')
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
            onAdd={() => setView('add')} />
        )}
        {view === 'add' && <AddStudent onSave={save} onCancel={() => setView('pick')} />}
        {view === 'session' && active && <Session child={active} onExit={() => setView('pick')} />}
      </main>
      <footer className="ver">v{APP_VERSION}</footer>
    </div>
  )
}
