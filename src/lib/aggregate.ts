// ISO-week helpers for weekly rollups (§11 aggregates). Pure.

// ISO-8601 week key "YYYY-Www" (weeks start Monday; week 1 contains the first Thursday).
export function isoWeek(ts: number): string {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  // Shift to the Thursday of this week (ISO weeks are Thursday-anchored).
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const firstThu = new Date(d.getFullYear(), 0, 4)
  firstThu.setDate(firstThu.getDate() + 3 - ((firstThu.getDay() + 6) % 7))
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / (7 * 86400000))
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`
}

// Are two ISO-week keys exactly one week apart (b immediately follows a)? Used for streaks.
export function isConsecutiveWeek(a: string, b: string): boolean {
  return weekOrdinal(b) - weekOrdinal(a) === 1
}

// A monotonic ordinal for an ISO-week key, so consecutive weeks differ by 1 across year
// boundaries. Anchored on the Monday of that ISO week.
function weekOrdinal(key: string): number {
  const [y, w] = key.split('-W').map(Number)
  const jan4 = new Date(y, 0, 4)
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7)
  return Math.round(monday.getTime() / (7 * 86400000))
}
