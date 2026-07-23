import { useEffect, useRef, useState } from 'react'

// Star Coins counter (M6 §20.4). Shows the child's coin total; pops when it increases. The pop
// animation is CSS and is disabled under prefers-reduced-motion / Calm Mode (data-calm on <html>).
export function CoinCounter(props: { coins: number }) {
  const [pop, setPop] = useState(false)
  const prev = useRef(props.coins)
  useEffect(() => {
    if (props.coins > prev.current) { setPop(true); const t = setTimeout(() => setPop(false), 500); return () => clearTimeout(t) }
    prev.current = props.coins
  }, [props.coins])
  useEffect(() => { prev.current = props.coins }, [props.coins])
  return (
    <span className={'coin-counter' + (pop ? ' pop' : '')} aria-label={`${props.coins} star coins`}>
      <span className="coin-ico" aria-hidden="true">⭐</span>{props.coins}
    </span>
  )
}
