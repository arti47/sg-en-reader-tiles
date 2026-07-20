// Headless end-to-end verification (CLAUDE.md §18.5). Spawns the dev server
// (DEV exposes window.__item for deterministic answering), drives both the
// mastery path and the struggle→lesson path, asserts zero console errors,
// no horizontal overflow at 390px, dual-gate + certificate invariants.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'

const EXE = process.env.PW_EXE || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'
const PORT = 5100 + Math.floor(Math.random() * 800) // avoid orphaned-server port clashes
const BASE = `http://localhost:${PORT}/sg-en-reader-tiles/`

// Spawn Vite's JS entry via node directly (not the .bin/vite shim, which doesn't
// forward signals), so killing this child process reliably stops the server.
const viteJs = new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname
const server = spawn(process.execPath, [viteJs, '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => { try { server.kill('SIGKILL') } catch {} }
const fail = (m) => { console.error('FAIL:', m); stop(); process.exit(1) }
try {
  // wait for a real HTTP 200 (not just a resolved fetch)
  let up = false
  for (let i = 0; i < 60; i++) { try { const r = await fetch(BASE); if (r.status === 200) { up = true; break } } catch {} await sleep(250) }
  if (!up) fail('dev server did not become ready')

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

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    let lessons = 0
    const lbl = g => new RegExp('^' + g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')

    // Warm-up placement runs first (quiet decode items, auto-advance on tap). Drive it
    // until the child picker appears. Gate on a fresh screen (enabled tile) so
    // window.__item is never read ahead of the rendered item (same race as the session).
    for (let step = 0; step < 30; step++) {
      const kind = await page.waitForFunction(() => {
        if (/Who's reading\?/.test(document.body.innerText)) return 'pick'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'pick') break
      const it = await page.evaluate(() => window.__item || null)
      const pick = WRONG ? it.choices.find(c => c.id !== it.correctChoiceId) : it.choices.find(c => c.id === it.correctChoiceId)
      await page.locator('button.tile', { hasText: lbl(pick.label) }).first().click()
    }
    await page.getByRole('button', { name: /Test/ }).click()
    for (let step = 0; step < 90; step++) {
      // Wait for a settled screen: an end/lesson/cert screen, OR a FRESH interactive
      // item (an enabled tile present and no "Continue" yet). This rules out acting on
      // a stale/answered screen while window.__item has already advanced.
      const kind = await page.waitForFunction(() => {
        const t = document.body.innerText
        if (/Great session/.test(t)) return 'summary'
        if (/Certificate earned!/.test(t)) return 'cert'
        if (/Let's learn this/.test(t)) return 'lesson'
        const hasContinue = [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue')
        const freshTile = document.querySelector('button.tile:not([disabled])')
        return (freshTile && !hasContinue) ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue()).catch(async () => {
        const body = (await page.evaluate(() => document.body.innerText)).replace(/\n+/g, ' | ')
        const state = await page.evaluate(() => ({
          continue: [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue'),
          tiles: document.querySelectorAll('button.tile').length,
          freshTiles: document.querySelectorAll('button.tile:not([disabled])').length
        }))
        fail(`stall @ WRONG=${WRONG} step=${step}: body="${body.slice(0, 90)}" ${JSON.stringify(state)} errors=${JSON.stringify(errors)}`)
      })

      if (kind === 'summary') break
      if (kind === 'cert') { await page.getByRole('button', { name: 'Keep going' }).click(); continue }
      if (kind === 'lesson') { lessons++; await page.getByRole('button', { name: "Let's try" }).click(); continue }

      const item = await page.evaluate(() => window.__item || null)
      if (item.graphemes) {
        for (const g of item.graphemes) await page.locator('button.tile', { hasText: lbl(g) }).first().click()
        await page.getByRole('button', { name: 'Check' }).click()
      } else {
        const pick = (WRONG && item.itemType === 'decode_choice')
          ? item.choices.find(c => c.id !== item.correctChoiceId).id : item.correctChoiceId
        const label = item.choices.find(c => c.id === pick).label
        await page.locator('button.tile', { hasText: lbl(label) }).first().click()
      }
      await page.getByRole('button', { name: 'Continue' }).click()
    }
    const db = await page.evaluate(() => new Promise(res => {
      const o = indexedDB.open('sg-reader')
      o.onsuccess = () => {
        const t = o.result.transaction(['progress', 'certificates', 'reviews'], 'readonly'); const out = {}
        t.objectStore('progress').getAll().onsuccess = e => out.progress = e.target.result
        t.objectStore('certificates').getAll().onsuccess = e => out.certs = e.target.result
        t.objectStore('reviews').getAll().onsuccess = e => out.reviews = e.target.result
        t.oncomplete = () => res(out)
      }
    }))
    results.push({ WRONG, errors, overflow, lessons, db })
    await ctx.close()
  }

  // Manage students: add one, run placement, then remove it and assert it's gone.
  {
    const mctx = await browser.newContext({ viewport: { width: 390, height: 800 } })
    const mp = await mctx.newPage(); mp.setDefaultTimeout(6000)
    await mp.goto(BASE, { waitUntil: 'networkidle' })
    await mp.getByText('Add student').click()
    await mp.locator('input').fill('Mgr')
    await mp.getByRole('button', { name: 'P1', exact: true }).click()
    await mp.getByRole('button', { name: 'Save' }).click()
    for (let i = 0; i < 30; i++) {
      const kind = await mp.waitForFunction(() => {
        if (/Who's reading\?/.test(document.body.innerText)) return 'pick'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'pick') break
      await mp.locator('button.tile:not([disabled])').first().click()
    }
    await mp.getByRole('button', { name: 'Manage' }).click()
    await mp.getByRole('button', { name: 'Remove', exact: true }).click() // open confirm
    await mp.getByRole('button', { name: 'Remove', exact: true }).click() // confirm
    await mp.waitForFunction(() => !/Mgr/.test(document.body.innerText), { timeout: 6000 })
      .catch(() => fail('manage: remove student did not delete the profile'))
    await mctx.close()
  }

  // SRS pure-function invariants (§7): +2/+7/+21d schedule, pass advances, fail demotes, due filter+cap.
  const srsPage = await browser.newPage()
  await srsPage.goto(BASE, { waitUntil: 'networkidle' })
  const srsCheck = await srsPage.evaluate(() => {
    const s = window.__srs, DAY = 86400000, now = 1000000
    if (!s) return 'window.__srs missing'
    const f = s.scheduleFirst('X', now)
    if (f.stage !== 0 || f.due !== now + 2 * DAY || f.status !== 'scheduled') return 'scheduleFirst +2d'
    const p1 = s.onReviewPass(f, now)
    if (p1.stage !== 1 || p1.due !== now + 7 * DAY) return 'onReviewPass +7d'
    const p2 = s.onReviewPass(p1, now)
    if (p2.stage !== 2 || p2.due !== now + 21 * DAY) return 'onReviewPass +21d'
    const p3 = s.onReviewPass(p2, now)
    if (p3.status !== 'graduated') return 'graduate after last'
    const dem = s.onReviewFail(p1, now)
    if (dem.stage !== 0 || dem.due !== now + 2 * DAY) return 'onReviewFail demote'
    const revs = [{ skillId: 'A', due: now - 1, stage: 0, status: 'scheduled' },
      { skillId: 'B', due: now + DAY, stage: 0, status: 'scheduled' },
      { skillId: 'C', due: now - 5, stage: 0, status: 'graduated' }]
    const due = s.dueReviews(revs, now)
    if (due.length !== 1 || due[0].skillId !== 'A') return 'dueReviews filter'
    const many = Array.from({ length: 6 }, (_, i) => ({ skillId: 'S' + i, due: now - i, stage: 0, status: 'scheduled' }))
    if (s.dueReviews(many, now).length !== 4) return 'dueReviews cap 4'
    return 'ok'
  })
  await browser.close()
  if (srsCheck !== 'ok') fail('SRS invariant: ' + srsCheck)

  // Assertions
  for (const r of results) {
    if (r.errors.length) fail(`console errors (${r.WRONG ? 'wrong' : 'correct'}): ${r.errors.slice(0, 3)}`)
    if (r.overflow) fail('horizontal overflow at 390px')
  }
  const good = results.find(r => !r.WRONG)
  // Answering placement correctly places the child above CVC (CVC marked mastered by
  // placement), then the session masters the entry skill and certifies. Assert ≥1
  // certificate and that placement marked CVC decode mastered.
  if (good.db.certs.length < 1) fail(`expected ≥1 certificate on mastery path, got ${good.db.certs.length}`)
  const cvc = good.db.progress.find(p => p.skillId === 'PH-cvc-short-vowels')
  if (!cvc || cvc.status !== 'mastered') fail('placement: CVC decode should be marked mastered')
  // Mastering a skill in-session schedules its first spaced review (+2d, stage 0).
  const sched = (good.db.reviews || []).find(r => r.stage === 0 && r.status === 'scheduled')
  if (!sched) fail('SRS: mastering a skill should schedule a review')
  const bad = results.find(r => r.WRONG)
  if (bad.lessons < 1) fail('struggle path: expected a lesson branch')
  if (bad.db.progress.some(p => p.skillId === 'SP-cvc-short-vowels')) fail('dual gate: encode must stay locked when decode <70%')
  if (bad.db.certs.length) fail('struggle path: no certificate should be awarded')

  console.log('PASS — placement→session, mastery+certs+review-scheduled, struggle→lesson, dual-gate lockout, SRS math, remove-student, zero errors, no overflow')
  stop(); process.exit(0)
} catch (e) { fail(e.message || String(e)) }
