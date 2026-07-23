// M7.3 fatigue/affect-aware pacing (§21.2 C). Pure, invisible detection over the CURRENT session's
// answers (never a timer, never shown as a countdown). A child is "tiring" when their recent
// response times rise well above their own session baseline, OR when errors cluster. The Session
// responds by easing to a confidence break + offering a non-forced breather + logging the episode
// for the adult — it NEVER forces an early end and NEVER changes mastery (§21.4).
export const FATIGUE_MIN_ITEMS = 6   // need this many this-session answers before detecting anything
export const BASELINE_N = 4          // baseline = median latency of the first answers this session
export const RECENT_N = 3            // current = median latency of the last few answers
export const LATENCY_RATIO = 1.5     // current/baseline at/above this ⇒ tiring
export const CLUSTER_WINDOW = 4
export const CLUSTER_MISSES = 3      // ≥ this many wrong in the last window ⇒ an error cluster

export interface SessionAnswer { latencyMs: number; correct: boolean }
export interface FatigueSignal { fatigued: boolean; latencyRatio: number; errorCluster: boolean }

function median(ns: number[]): number {
  if (!ns.length) return 0
  const s = [...ns].sort((a, b) => a - b)
  return s[Math.floor(s.length / 2)]
}

// Detect within-session fatigue from the answers so far. Deterministic + pure.
export function detectFatigue(items: SessionAnswer[]): FatigueSignal {
  if (items.length < FATIGUE_MIN_ITEMS) return { fatigued: false, latencyRatio: 1, errorCluster: false }
  const lat = items.map(i => i.latencyMs)
  const baseline = median(lat.slice(0, BASELINE_N)) || 1
  const current = median(lat.slice(-RECENT_N))
  const latencyRatio = current / baseline
  const rising = latencyRatio >= LATENCY_RATIO
  const errorCluster = items.slice(-CLUSTER_WINDOW).filter(i => !i.correct).length >= CLUSTER_MISSES
  return { fatigued: rising || errorCluster, latencyRatio, errorCluster }
}
