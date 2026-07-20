// Headless end-to-end verification (CLAUDE.md §18.5). Spawns the dev server
// (DEV exposes window.__item for deterministic answering), drives both the
// mastery path and the struggle→lesson path, asserts zero console errors,
// no horizontal overflow at 390px, dual-gate + certificate invariants.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const EXE = process.env.PW_EXE || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
const PORT = 5199
const BASE = `http://localhost:${PORT}/sg-en-reader-tiles/`

const bin = process.platform === 'win32' ? 'vite.cmd' : 'vite'
const server = spawn(new URL(`../node_modules/.bin/${bin}`, import.meta.url).pathname,
  ['--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const fail = (m) => { console.error('FAIL:', m); server.kill(); process.exit(1) }
try {
  // wait for server
  for (let i = 0; i < 40; i++) { try { const r = await fetch(BASE); if (r.ok) break } catch {} await sleep(250) }

  const browser = await chromium.launch({ executablePath: EXE })
  const results = []
  for (const WRONG of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 } }) // isolated storage per run
    const page = await ctx.newPage()
    page.setDefaultTimeout(6000)
    const errors = []
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
    page.on('pageerror', e => errors.push('pageerror: ' + e.message))

    await page.goto(BASE, { waitUntil: 'networkidle' })
    await page.getByText('Add student').click()
    await page.locator('input').fill('Test')
    await page.getByRole('button', { name: 'P1', exact: true }).click()
    await page.getByRole('button', { name: 'Save' }).click()
    await page.getByRole('button', { name: /Test/ }).click()

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    let lessons = 0
    for (let step = 0; step < 90; step++) {
      if (await page.getByText('Great session').count()) break
      if (await page.getByText('Certificate earned!').count()) { await page.getByRole('button', { name: 'Keep going' }).click(); continue }
      if (await page.getByText("Let's learn this").count()) { lessons++; await page.getByRole('button', { name: "Let's try" }).click(); continue }
      await page.waitForTimeout(80)
      const item = await page.evaluate(() => window.__item || null)
      if (!item) { await page.waitForTimeout(50); continue }
      if (item.graphemes) {
        for (const g of item.graphemes) await page.locator('button.tile', { hasText: new RegExp('^' + g + '$') }).first().click()
        await page.getByRole('button', { name: 'Check' }).click()
      } else {
        const pick = (WRONG && item.itemType === 'decode_choice')
          ? item.choices.find(c => c.id !== item.correctChoiceId).id : item.correctChoiceId
        const label = item.choices.find(c => c.id === pick).label
        await page.locator('button.tile', { hasText: new RegExp('^' + label + '$') }).first().click()
      }
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    const db = await page.evaluate(() => new Promise(res => {
      const o = indexedDB.open('sg-reader', 2)
      o.onsuccess = () => {
        const t = o.result.transaction(['progress', 'certificates'], 'readonly'); const out = {}
        t.objectStore('progress').getAll().onsuccess = e => out.progress = e.target.result
        t.objectStore('certificates').getAll().onsuccess = e => out.certs = e.target.result
        t.oncomplete = () => res(out)
      }
    }))
    results.push({ WRONG, errors, overflow, lessons, db })
    await ctx.close()
  }
  await browser.close()

  // Assertions
  for (const r of results) {
    if (r.errors.length) fail(`console errors (${r.WRONG ? 'wrong' : 'correct'}): ${r.errors.slice(0, 3)}`)
    if (r.overflow) fail('horizontal overflow at 390px')
  }
  const good = results.find(r => !r.WRONG)
  if (good.db.certs.length !== 2) fail(`expected 2 certificates on mastery path, got ${good.db.certs.length}`)
  if (!good.db.progress.every(p => p.status === 'mastered')) fail('mastery path: both skills should be mastered')
  const bad = results.find(r => r.WRONG)
  if (bad.lessons < 1) fail('struggle path: expected a lesson branch')
  if (bad.db.progress.some(p => p.skillId === 'SP-cvc-short-vowels')) fail('dual gate: encode must stay locked when decode <70%')
  if (bad.db.certs.length) fail('struggle path: no certificate should be awarded')

  console.log('PASS — mastery+certs, struggle→lesson, dual-gate lockout, zero errors, no overflow')
  server.kill(); process.exit(0)
} catch (e) { fail(e.message || String(e)) }
