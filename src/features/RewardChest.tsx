import { useState } from 'react'
import { playSfx } from '../lib/audio-sfx'

// M6.4 §20.4 — the mission-complete reward chest on the session summary. Tap to open → coin burst +
// sound; the parent awards the bonus on open (once). Purely a reward flourish (coins are cosmetic).
export function RewardChest(props: { bonus: number; onOpen: () => void }) {
  const [open, setOpen] = useState(false)
  function pop() {
    if (open) return
    setOpen(true); playSfx('chest'); props.onOpen()
  }
  return (
    <div className="chest-wrap">
      {!open ? (
        <button className="chest" onClick={pop} aria-label="Open your reward chest">
          <span className="chest-ico">🎁</span>
          <span className="chest-label">Tap to open your reward!</span>
        </button>
      ) : (
        <div className="chest chest-open" aria-live="polite">
          <span className="chest-ico">💰</span>
          <span className="chest-label">+{props.bonus} Star Coins!</span>
        </div>
      )}
    </div>
  )
}
