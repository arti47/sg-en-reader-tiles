// Animated canvas starfield for the galaxy hub (M6 §20.5). Drifting stars behind the planets.
// Respects reduced-motion / Calm Mode: renders a single static frame instead of animating.
export function startStarfield(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  let w = 0, h = 0
  const stars: { x: number; y: number; r: number; s: number }[] = []
  function resize() {
    w = canvas.clientWidth; h = canvas.clientHeight
    canvas.width = w * dpr; canvas.height = h * dpr; ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!stars.length) for (let i = 0; i < Math.round((w * h) / 6000); i++)
      stars.push({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.15 + 0.03 })
  }
  function draw() {
    ctx!.clearRect(0, 0, w, h)
    for (const st of stars) { ctx!.globalAlpha = 0.5 + st.r / 4; ctx!.fillStyle = '#fff'; ctx!.beginPath(); ctx!.arc(st.x, st.y, st.r, 0, 7); ctx!.fill() }
    ctx!.globalAlpha = 1
  }
  resize(); draw()
  const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    || document.documentElement.dataset.calm === 'on'
  if (still) { const onR = () => { resize(); draw() }; window.addEventListener('resize', onR); return () => window.removeEventListener('resize', onR) }
  let raf = 0
  const tick = () => {
    for (const st of stars) { st.y += st.s; if (st.y > h) { st.y = 0; st.x = Math.random() * w } }
    draw(); raf = requestAnimationFrame(tick)
  }
  const onResize = () => resize()
  window.addEventListener('resize', onResize); raf = requestAnimationFrame(tick)
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
}
