import { useState } from 'react'

// On-screen 4-digit PIN pad (§14 PIN-gated, §18.12 no native dialogs). Touch-first, labelled.
export function PinPad(props: { title: string; error?: boolean; onComplete: (pin: string) => void; onCancel?: () => void }) {
  const [pin, setPin] = useState('')
  function push(d: string) {
    const next = (pin + d).slice(0, 4)
    setPin(next)
    if (next.length === 4) { props.onComplete(next); setPin('') }
  }
  return (
    <div className="stack center pinpad">
      <h1>{props.title}</h1>
      <div className="pin-dots" aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map(i => <span key={i} className={'pin-dot' + (i < pin.length ? ' on' : '')} />)}
      </div>
      {props.error && <p className="feedback no" aria-live="polite">That PIN didn't match — try again.</p>}
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
          <button key={d} className="key" onClick={() => push(d)}>{d}</button>
        ))}
        {props.onCancel
          ? <button className="key ghost" onClick={props.onCancel}>Cancel</button>
          : <span />}
        <button className="key" onClick={() => push('0')}>0</button>
        <button className="key ghost" onClick={() => setPin(p => p.slice(0, -1))} aria-label="Delete last digit">⌫</button>
      </div>
    </div>
  )
}
