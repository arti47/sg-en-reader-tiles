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
    let firstSkill = null // first skill the session serves (A1: must respect placement, not restart at CVC)
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
      if (!firstSkill) firstSkill = item.skillId
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
    results.push({ WRONG, errors, overflow, lessons, db, firstSkill })
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
  // Engine invariants (§7): A2 dual gate, A1 placement-mastery, A3 difficulty streak.
  const engineCheck = await srsPage.evaluate(() => {
    const e = window.__engine, gs = window.__getSkill
    if (!e || !gs) return '__engine/__getSkill missing'
    let k = 0
    const mk = (skillId, correct) => ({ id: String(k), childId: 'c', skillId, itemId: 'i', correct, difficulty: 1, latencyMs: 1, ts: k++ })
    const arr = (id, n, ok = true) => Array.from({ length: n }, () => mk(id, ok))
    const PH = 'PH-cvc-short-vowels', SP = 'SP-cvc-short-vowels'
    const dec = gs(PH)
    // A2 — a pattern needs BOTH decode and encode; decode alone must not pass.
    const decodeOnly = arr(PH, 8, true)
    if (!e.skillMastered(decodeOnly, dec)) return 'A2 decode should master'
    if (e.patternMastered(decodeOnly, dec)) return 'A2 pattern must NOT pass on decode alone'
    if (!e.patternMastered([...decodeOnly, ...arr(SP, 8, true)], dec)) return 'A2 pattern should pass with both'
    // A2 advancement gate — with only CVC decode mastered, the next decode skill (digraphs) must
    // NOT be eligible (its encode partner is); it unlocks only once the whole CVC pattern is done.
    const decElig = e.eligibleSkills(decodeOnly).map(s => s.id)
    if (decElig.includes('PH-digraphs')) return 'A2 advancement: digraphs unlocked on decode alone'
    if (!decElig.includes(SP)) return 'A2 encode partner should be eligible at ≥70% decode'
    if (!e.eligibleSkills([...decodeOnly, ...arr(SP, 8, true)]).map(s => s.id).includes('PH-digraphs')) return 'A2 advancement: digraphs should unlock after full pattern'
    // A1 — placement-mastered skills count without attempts.
    if (e.isMastered([], dec)) return 'A1 unmastered without attempts'
    if (!e.isMastered([], dec, new Set([PH]))) return 'A1 placement-mastered should count'
    if (!e.patternMastered([], dec, new Set([PH, SP]))) return 'A1 placement pattern'
    // A3 — streak of 3 climbs one step; 4 holds (reset after promotion); 6 climbs again; 2 wrong demotes.
    if (e.nextDifficulty(arr(PH, 3, true), PH, 1) !== 2) return 'A3 streak3 → +1'
    if (e.nextDifficulty(arr(PH, 4, true), PH, 2) !== 2) return 'A3 streak4 → hold'
    if (e.nextDifficulty(arr(PH, 6, true), PH, 2) !== 3) return 'A3 streak6 → +1'
    if (e.nextDifficulty([...arr(PH, 2, true), mk(PH, false), mk(PH, false)], PH, 3) !== 2) return 'A3 two wrong → −1'
    return 'ok'
  })
  await browser.close()
  if (srsCheck !== 'ok') fail('SRS invariant: ' + srsCheck)
  if (engineCheck !== 'ok') fail('engine invariant: ' + engineCheck)

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
  // A1 — the session must honour placement: it should NOT re-serve the CVC skill placement
  // already mastered, i.e. it starts at the entry skill above it.
  if (good.firstSkill === 'PH-cvc-short-vowels') fail('A1: session ignored placement — re-served mastered CVC')
  if (!good.firstSkill) fail('A1: no session item was served on the good path')
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
