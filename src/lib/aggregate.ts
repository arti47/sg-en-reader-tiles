// ISO-week helpers for weekly rollups (§11 aggregates). Pure.
import type { Aggregate, Daily } from '../types'

// Local calendar-day key "YYYY-MM-DD" for the daily rollup.
export function isoDay(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

// The Monday (week start) of an ISO-week key, as a Date.
export function weekMonday(key: string): Date {
  const [y, w] = key.split('-W').map(Number)
  const jan4 = new Date(y, 0, 4)
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (w - 1) * 7)
  return monday
}

// Friendly chart label for an ISO-week key: the Monday date, e.g. "21 Jul" (en-GB), instead
// of the cryptic "W30".
export function weekLabel(key: string): string {
  return weekMonday(key).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// A monotonic ordinal for an ISO-week key, so consecutive weeks differ by 1 across year
// boundaries. Anchored on the Monday of that ISO week.
function weekOrdinal(key: string): number {
  return Math.round(weekMonday(key).getTime() / (7 * 86400000))
}

// ---- Trend summary at day / week / month / year granularity (§11) ----
export type Granularity = 'day' | 'week' | 'month' | 'year'
export interface Bucket { key: string; label: string; items: number; correct: number }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Group per-skill weekly aggregates (or per-day rows) into ordered buckets for the chart. `daily`
// feeds the day view (only history since v5); week/month/year roll up the weekly aggregates (full
// history). Returns the most recent `cap` buckets, oldest→newest.
export function summarise(aggregates: Aggregate[], daily: Daily[], gran: Granularity, cap = 12): Bucket[] {
  const map = new Map<string, { label: string; items: number; correct: number }>()
  const add = (key: string, label: string, items: number, correct: number) => {
    const b = map.get(key) ?? { label, items: 0, correct: 0 }
    b.items += items; b.correct += correct; map.set(key, b)
  }
  if (gran === 'day') {
    for (const d of daily) {
      const [y, m, day] = d.day.split('-').map(Number)
      add(d.day, `${day} ${MONTHS[m - 1]}`, d.items, d.correct); void y
    }
  } else {
    for (const a of aggregates) {
      const mon = weekMonday(a.week)
      if (gran === 'week') add(a.week, weekLabel(a.week), a.items, a.correct)
      else if (gran === 'month') add(`${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}`, `${MONTHS[mon.getMonth()]} ${String(mon.getFullYear()).slice(-2)}`, a.items, a.correct)
      else add(String(mon.getFullYear()), String(mon.getFullYear()), a.items, a.correct)
    }
  }
  return [...map.entries()]
    .map(([key, v]) => ({ key, label: v.label, items: v.items, correct: v.correct }))
    .sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
    .slice(-cap)
}
