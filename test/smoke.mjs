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
    let placeCount = 0
    for (let step = 0; step < 30; step++) {
      const kind = await page.waitForFunction(() => {
        if (/Who's reading\?/.test(document.body.innerText)) return 'pick'
        if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'pick') break
      if (kind === 'done') { await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
      const it = await page.evaluate(() => window.__item || null)
      const pick = WRONG ? it.choices.find(c => c.id !== it.correctChoiceId) : it.choices.find(c => c.id === it.correctChoiceId)
      await page.locator('button.tile', { hasText: lbl(pick.label) }).first().click()
      placeCount++
    }
    // Warm-up must not stop abruptly: at least MIN_WARMUP (6) items even when the child
    // misses the first pair (the reported "ends after two steps" bug).
    if (placeCount < 6) fail(`placement ended after ${placeCount} items (expected ≥6) @ WRONG=${WRONG}`)
    const readDb = () => page.evaluate(() => new Promise(res => {
      const o = indexedDB.open('sg-reader')
      o.onsuccess = () => {
        const t = o.result.transaction(['progress', 'certificates', 'reviews', 'aggregates', 'usage'], 'readonly'); const out = {}
        t.objectStore('progress').getAll().onsuccess = e => out.progress = e.target.result
        t.objectStore('certificates').getAll().onsuccess = e => out.certs = e.target.result
        t.objectStore('reviews').getAll().onsuccess = e => out.reviews = e.target.result
        t.objectStore('aggregates').getAll().onsuccess = e => out.aggregates = e.target.result
        t.objectStore('usage').getAll().onsuccess = e => out.usage = e.target.result
        t.oncomplete = () => res(out)
      }
    }))
    let db = null
    // Drive one full session's item loop to the summary. `answerWrong` picks wrong decode
    // answers (struggle path). Closes over page/errors/lbl/lessons/firstSkill.
    async function playSession(answerWrong) {
      let afterLesson = false
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

        if (kind === 'summary') return
        if (kind === 'cert') { await page.getByRole('button', { name: 'Keep going' }).click(); continue }
        if (kind === 'lesson') { lessons++; afterLesson = true; await page.getByRole('button', { name: "Let's try" }).click(); continue }

        const item = await page.evaluate(() => window.__item || null)
        if (!firstSkill) firstSkill = item.skillId
        // #4 — the item right after a lesson is a guided-practice item at difficulty 1.
        if (afterLesson) { if (item.difficulty !== 1) fail(`#4: post-lesson guided item should be difficulty 1, got ${item.difficulty}`); afterLesson = false }
        if (item.graphemes) {
          // Click an ENABLED matching tile each time (words with a repeated grapheme, e.g. p·o·p,
          // reuse the same label — .first() alone would re-target the now-disabled first tile).
          for (const g of item.graphemes) await page.locator('button.tile:not([disabled])', { hasText: lbl(g) }).first().click()
          await page.getByRole('button', { name: 'Check' }).click()
        } else {
          const pick = (answerWrong && item.itemType === 'decode_choice')
            ? item.choices.find(c => c.id !== item.correctChoiceId).id : item.correctChoiceId
          // Click by choice index — letter-sound tiles carry a keyword sublabel so exact-text match won't hit.
          const idx = item.choices.findIndex(c => c.id === pick)
          await page.locator('button.tile').nth(idx).click()
        }
        await page.getByRole('button', { name: 'Continue' }).click()
      }
    }
    const returnToPicker = async () => {
      await page.getByRole('button', { name: 'Done' }).click()
      await page.waitForFunction(() => /Who's reading\?/.test(document.body.innerText), { timeout: 6000 })
    }
    // §7 #1 retention gate: the certificate is WITHHELD at acquisition and minted only on the
    // first +2d review pass. So the mastery path (a) plays sessions until a pattern is
    // provisionally mastered (a review is scheduled), asserting NO certificate yet, then
    // (b) backdates that review and plays one more session — passing the due review confirms
    // retention and awards the certificate. #2 (minItems 12) means this spans several sessions.
    const SESSIONS = WRONG ? 1 : 8
    for (let s = 0; s < SESSIONS; s++) {
      await page.getByRole('button', { name: /Play with Test/ }).click()
      await playSession(WRONG)
      db = await readDb()
      if (!WRONG && (db.reviews || []).some(r => r.status === 'scheduled')) break
      if (s < SESSIONS - 1) await returnToPicker()
    }
    if (!WRONG) {
      if (!(db.reviews || []).some(r => r.status === 'scheduled')) fail('mastery path: no pattern provisionally mastered (no review scheduled)')
      if (db.certs.length) fail('§7 #1: certificate must NOT be awarded at acquisition (only on the +2d review pass)')
      await returnToPicker()
      // Backdate the scheduled reviews so they are due, then confirm on the next session.
      await page.evaluate(() => new Promise(res => {
        const o = indexedDB.open('sg-reader')
        o.onsuccess = () => {
          const t = o.result.transaction('reviews', 'readwrite'); const st = t.objectStore('reviews')
          st.getAll().onsuccess = e => { for (const rv of e.target.result) { rv.due = Date.now() - 1000; st.put(rv) } }
          t.oncomplete = () => res()
        }
      }))
      await page.getByRole('button', { name: /Play with Test/ }).click()
      await playSession(false)
      // Session-summary highlights (§14): the confirmation minted a certificate, so the summary
      // must surface a "New this session!" award block (child sees achievements immediately).
      const summaryText = await page.evaluate(() => document.body.innerText)
      if (!/New this session/.test(summaryText)) fail('summary: should highlight new awards after earning a certificate')
      db = await readDb()
      // Child-facing trophy room, reached from the summary → shows badges + the earned certificate.
      await page.getByRole('button', { name: /My trophies/ }).click()
      await page.waitForFunction(() => /trophies/i.test(document.body.innerText), { timeout: 6000 })
      const troText = await page.evaluate(() => document.body.innerText)
      if (!/My badges/.test(troText)) fail('trophies: badges section missing')
      if (!/My certificates/.test(troText) || !/I can/.test(troText)) fail('trophies: earned certificate missing')
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('trophies: horizontal overflow at 390px')
    }
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
        if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'pick') break
      if (kind === 'done') { await mp.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
      await mp.locator('button.tile:not([disabled])').first().click()
    }
    // Force the wider OpenDyslexic font to catch layout overflow (§18.5).
    await mp.evaluate(() => { document.documentElement.dataset.font = 'dyslexic' })
    await mp.getByRole('button', { name: 'Manage' }).click()
    if (await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('manage: horizontal overflow (dyslexic font)')
    await mp.getByRole('button', { name: 'Remove', exact: true }).click() // open confirm
    if (await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('manage confirm: horizontal overflow (dyslexic font)')
    await mp.getByRole('button', { name: 'Remove', exact: true }).click() // confirm
    await mp.waitForFunction(() => !/Mgr/.test(document.body.innerText), { timeout: 6000 })
      .catch(() => fail('manage: remove student did not delete the profile'))
    await mctx.close()
  }

  // Picker card overflow (reported): on a wider phone the cards get narrow enough for 3 columns,
  // and the per-card Play + 🏆 Trophies buttons spilled PAST the card (still inside the viewport, so
  // a document-overflow check misses it). Add two students, then assert every action button's box
  // stays within its card's box — under the wide OpenDyslexic font, at a 430px viewport.
  {
    const octx = await browser.newContext({ viewport: { width: 430, height: 900 } })
    const op = await octx.newPage(); op.setDefaultTimeout(6000)
    await op.goto(BASE, { waitUntil: 'networkidle' })
    for (const nm of ['Alexandra', 'Tom']) {
      await op.getByText('Add student').click()
      await op.locator('input').fill(nm)
      await op.getByRole('button', { name: 'P1', exact: true }).click()
      await op.getByRole('button', { name: 'Save' }).click()
      for (let i = 0; i < 30; i++) {
        const kind = await op.waitForFunction(() => {
          if (/Who's reading\?/.test(document.body.innerText)) return 'pick'
          if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
          return document.querySelector('button.tile:not([disabled])') ? 'item' : null
        }, { timeout: 8000 }).then(h => h.jsonValue())
        if (kind === 'pick') break
        if (kind === 'done') { await op.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
        await op.locator('button.tile:not([disabled])').first().click()
      }
    }
    await op.evaluate(() => { document.documentElement.dataset.font = 'dyslexic' })
    // A button must not exceed the card's inner CONTENT box (past the padding into/over the border).
    // getBoundingClientRect of the card is the border-box, so derive the content edges from padding
    // + border — a button wider than the content area is the reported spill (a border-box check would
    // miss a spill that stays within the padding cushion, as this one does at 430px).
    const spill = await op.evaluate(() => {
      for (const card of document.querySelectorAll('.avatar')) {
        const cr = card.getBoundingClientRect(); const cs = getComputedStyle(card)
        const cl = cr.left + parseFloat(cs.borderLeftWidth) + parseFloat(cs.paddingLeft)
        const crr = cr.right - parseFloat(cs.borderRightWidth) - parseFloat(cs.paddingRight)
        for (const btn of card.querySelectorAll('.btn')) {
          const br = btn.getBoundingClientRect()
          if (br.right > crr + 1.5 || br.left < cl - 1.5)
            return { card: card.textContent.replace(/\s+/g, ' ').trim().slice(0, 16), btn: btn.textContent.trim(), btnW: Math.round(br.width), contentW: Math.round(crr - cl) }
        }
      }
      return null
    })
    if (spill) fail('picker: an action button exceeds its card content box — ' + JSON.stringify(spill))
    await octx.close()
  }

  // M2 parent dashboard: add a child, open Parent area, create a PIN, see a growth card. Export works.
  {
    const dctx = await browser.newContext({ viewport: { width: 390, height: 800 } })
    const dp = await dctx.newPage(); dp.setDefaultTimeout(6000)
    const dErrors = []
    dp.on('console', m => { if (m.type() === 'error') dErrors.push(m.text()) })
    dp.on('pageerror', e => dErrors.push('pageerror: ' + e.message))
    await dp.goto(BASE, { waitUntil: 'networkidle' })
    // M4: boot applies the default font (Lexend) via data-font on the root.
    await dp.waitForFunction(() => document.documentElement.dataset.font === 'lexend', { timeout: 6000 })
      .catch(() => fail('M4 font: boot should set data-font=lexend'))
    await dp.getByText('Add student').click()
    await dp.locator('input').fill('Dash')
    await dp.getByRole('button', { name: 'P2', exact: true }).click()
    await dp.getByRole('button', { name: 'Save' }).click()
    for (let i = 0; i < 30; i++) {
      const kind = await dp.waitForFunction(() => {
        if (/Who's reading\?/.test(document.body.innerText)) return 'pick'
        if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'pick') break
      if (kind === 'done') { await dp.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
      await dp.locator('button.tile:not([disabled])').first().click()
    }
    // M4: picker card shows the gamification level badge.
    if (!/Lvl/.test(await dp.evaluate(() => document.body.innerText))) fail('M4 gamify: picker should show a level badge')
    await dp.getByRole('button', { name: /teacher area/i }).click()
    await dp.waitForFunction(() => /Create a teacher PIN/.test(document.body.innerText), { timeout: 6000 })
    for (const d of ['1', '2', '3', '4']) await dp.getByRole('button', { name: d, exact: true }).click()
    await dp.waitForFunction(() => /Re-enter to confirm/.test(document.body.innerText), { timeout: 6000 })
    for (const d of ['1', '2', '3', '4']) await dp.getByRole('button', { name: d, exact: true }).click()
    await dp.waitForFunction(() => /Teacher area/.test(document.body.innerText) && /skills mastered/.test(document.body.innerText), { timeout: 6000 })
      .catch(() => fail('dashboard: card did not render after PIN'))
    if (!/Dash/.test(await dp.evaluate(() => document.body.innerText))) fail('dashboard: child card missing')
    if (!/badges/.test(await dp.evaluate(() => document.body.innerText))) fail('M4 gamify: dashboard should show achievement badges')
    const dOverflow = await dp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    if (dOverflow) fail('dashboard: horizontal overflow at 390px')
    const [dl] = await Promise.all([
      dp.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      dp.getByRole('button', { name: 'Export backup' }).click()
    ])
    if (!dl) fail('dashboard: export backup did not download')
    // M4: font toggle applies immediately and persists across a reload.
    await dp.getByRole('button', { name: 'OpenDyslexic' }).click()
    await dp.waitForFunction(() => document.documentElement.dataset.font === 'dyslexic', { timeout: 6000 })
      .catch(() => fail('M4 font: toggle should set data-font=dyslexic'))
    if (await dp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('dashboard settings: horizontal overflow (dyslexic font)')
    await dp.reload({ waitUntil: 'networkidle' })
    await dp.waitForFunction(() => document.documentElement.dataset.font === 'dyslexic', { timeout: 6000 })
      .catch(() => fail('M4 font: choice should persist across reload'))
    if (dErrors.length) fail('dashboard console errors: ' + dErrors.slice(0, 3))
    await dctx.close()
  }

  // M3 renderers (grammar_cloze + passage_question) via the DEV #m3demo route.
  {
    const m3ctx = await browser.newContext({ viewport: { width: 390, height: 800 } })
    const mp3 = await m3ctx.newPage(); mp3.setDefaultTimeout(6000)
    const e3 = []
    mp3.on('console', m => { if (m.type() === 'error') e3.push(m.text()) })
    mp3.on('pageerror', e => e3.push('pageerror: ' + e.message))
    await mp3.goto(BASE + '#m3demo', { waitUntil: 'networkidle' })
    await mp3.waitForFunction(() => !!window.__m3, { timeout: 6000 }).catch(() => fail('m3 demo did not load'))
    const m3 = await mp3.evaluate(() => window.__m3)
    // Fill the grammar cloze: for each blank (in order) tap the bank word it accepts, then Check.
    const clozeBox = mp3.locator('[data-testid="m3-cloze"]')
    for (const b of m3.cloze.blanks) {
      const word = b.acceptable[0]
      await clozeBox.locator('button.word-tile', { hasText: new RegExp('^' + word + '$') }).first().click()
    }
    await clozeBox.getByRole('button', { name: 'Check' }).click()
    await clozeBox.locator('[aria-live="polite"]').waitFor({ timeout: 6000 })
    if (!/Yes!/.test(await clozeBox.innerText())) fail('m3 cloze: correct answers should score right')
    // Answer the comprehension MCQ correctly.
    const compBox = mp3.locator('[data-testid="m3-comp"]')
    const correct = m3.comp.choices.find(c => c.id === m3.comp.correctChoiceId).label
    await compBox.locator('button.tile', { hasText: new RegExp('^' + correct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click()
    if (!/Yes!/.test(await compBox.innerText())) fail('m3 comprehension: correct choice should score right')
    // Dictation (T11): build each word from its correct tiles, then Next word / Check.
    const dictBox = mp3.locator('[data-testid="m3-dict"]')
    for (let w = 0; w < m3.dict.words.length; w++) {
      for (const g of m3.dict.words[w].graphemes) {
        await dictBox.locator('button.tile', { hasText: new RegExp('^' + g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click()
      }
      const label = w < m3.dict.words.length - 1 ? 'Next word' : 'Check'
      await dictBox.getByRole('button', { name: label }).click()
    }
    if (!/Yes!/.test(await dictBox.innerText())) fail('m3 dictation: correctly built sentence should score right')
    // Editing (T17): pick the correction; MCQ, exact-match scoring.
    const editBox = mp3.locator('[data-testid="m3-edit"]')
    const editCorrect = m3.edit.choices.find(c => c.id === m3.edit.correctChoiceId).label
    await editBox.locator('button.tile', { hasText: new RegExp('^' + editCorrect.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }).first().click()
    if (!/Yes!/.test(await editBox.innerText())) fail('m3 editing: correct choice should score right')
    if (await mp3.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('m3 demo: horizontal overflow at 390px')
    if (e3.length) fail('m3 demo console errors: ' + e3.slice(0, 3))
    await m3ctx.close()
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
    // #2 — foundational decode/encode need 12 items (overlearning): 8 must NOT master.
    if (e.skillMastered(arr(PH, 8, true), dec)) return '#2 minItems: 8 items must not master (raised to 12)'
    // A2 — a pattern needs BOTH decode and encode; decode alone must not pass.
    const decodeOnly = arr(PH, 12, true)
    if (!e.skillMastered(decodeOnly, dec)) return 'A2 decode should master'
    if (e.patternMastered(decodeOnly, dec)) return 'A2 pattern must NOT pass on decode alone'
    if (!e.patternMastered([...decodeOnly, ...arr(SP, 12, true)], dec)) return 'A2 pattern should pass with both'
    // A2 advancement gate — with only CVC decode mastered, the next decode skill (digraphs) must
    // NOT be eligible (its encode partner is); it unlocks only once the whole CVC pattern is done.
    const decElig = e.eligibleSkills(decodeOnly).map(s => s.id)
    if (decElig.includes('PH-digraphs')) return 'A2 advancement: digraphs unlocked on decode alone'
    if (!decElig.includes(SP)) return 'A2 encode partner should be eligible at ≥70% decode'
    if (!e.eligibleSkills([...decodeOnly, ...arr(SP, 12, true)]).map(s => s.id).includes('PH-digraphs')) return 'A2 advancement: digraphs should unlock after full pattern'
    // A1 — placement-mastered skills count without attempts.
    if (e.isMastered([], dec)) return 'A1 unmastered without attempts'
    if (!e.isMastered([], dec, new Set([PH]))) return 'A1 placement-mastered should count'
    if (!e.patternMastered([], dec, new Set([PH, SP]))) return 'A1 placement pattern'
    // A3 — streak of 3 climbs one step; 4 holds (reset after promotion); 6 climbs again; 2 wrong demotes.
    if (e.nextDifficulty(arr(PH, 3, true), PH, 1) !== 2) return 'A3 streak3 → +1'
    if (e.nextDifficulty(arr(PH, 4, true), PH, 2) !== 2) return 'A3 streak4 → hold'
    if (e.nextDifficulty(arr(PH, 6, true), PH, 2) !== 3) return 'A3 streak6 → +1'
    if (e.nextDifficulty([...arr(PH, 2, true), mk(PH, false), mk(PH, false)], PH, 3) !== 2) return 'A3 two wrong → −1'
    // #3 — a placement-confirmed decoder unlocks its encode partner with no attempts (held-back
    // encode entry becomes eligible, placement.ts). Without placement + attempts it stays locked.
    if (e.encodeUnlocked([], dec)) return '#3 encodeUnlocked: no attempts/placement → locked'
    if (!e.encodeUnlocked([], dec, new Set([PH]))) return '#3 encodeUnlocked: placement decoder → unlocked'
    // #4 — earlier re-teach: <0.6 over ≥5 items, or 2 same-concept misses, triggers a lesson.
    const mc = (concept) => ({ id: String(k++), childId: 'c', skillId: PH, itemId: 'i', correct: false, difficulty: 1, missedConcept: concept, latencyMs: 1, ts: k })
    if (!e.struggling([...arr(PH, 2, true), mk(PH, false), mk(PH, false), mk(PH, false)], dec)) return '#4 struggle: <0.6 over ≥5 should trigger'
    if (!e.struggling([mc('vowel-short-a'), mc('vowel-short-a')], dec)) return '#4 struggle: 2 same-concept misses should trigger'
    if (e.struggling([...arr(PH, 4, true), mk(PH, false)], dec)) return '#4 struggle: 4/5 (0.8) should not trigger'
    // A5 — every 5th item interleaves a mastered-skill review (~18% of 16); none off-cadence or when nothing mastered.
    if (e.interleavedReviewSkill([], 0, new Set([PH]))) return 'A5 no interleave at count 0'
    if (e.interleavedReviewSkill([], 3, new Set([PH]))) return 'A5 no interleave off-cadence'
    const rev = e.interleavedReviewSkill([], 5, new Set([PH]))
    if (!rev || rev.id !== PH) return 'A5 interleave should pick a mastered skill'
    if (e.interleavedReviewSkill([], 5, new Set())) return 'A5 none when nothing mastered'
    let fires = 0; for (let n = 1; n <= 16; n++) if (e.interleavedReviewSkill([], n, new Set([PH]))) fires++
    if (fires !== 3) return 'A5 cadence should fire 3× per 16 items'
    // T01: PH-letter-sounds is active + now THREADED (woven in every 4th item, not a hard gate),
    // and no longer a prereq of CVC — so a struggling reader starts on real CVC words (visual
    // scaffold) instead of being walled behind audio-only isolated sounds.
    if (!gs('PH-letter-sounds')) return 'T01 should be active (phoneme clips shipped)'
    if (!gs('PH-letter-sounds').threaded) return 'T01 letter-sounds should be threaded now'
    if (gs('PH-letter-sounds').prereqs.length !== 0) return 'T01 letter-sounds should have no prereqs'
    if (gs(PH).prereqs.length !== 0) return 'T01: CVC should be the ladder floor (letter-sounds no longer gates it)'
    if (e.eligibleSkills([]).map(s => s.id).includes('PH-letter-sounds')) return 'T01: threaded letter-sounds must not be in the eligible rotation'
    if (e.eligibleSkills([]).map(s => s.id).includes('PH-cvc-short-vowels') === false) return 'T01: CVC should be eligible up front (it is the floor)'
    // M3 gating (§5) — grammar unlocks only after the decode ladder (PH-two-syllable pattern).
    if (e.eligibleSkills([]).map(s => s.id).includes('GR-articles')) return 'M3: grammar must be gated behind decoding'
    const decoded = [...arr('PH-two-syllable', 12, true), ...arr('SP-two-syllable', 12, true)]
    if (!e.eligibleSkills(decoded).map(s => s.id).includes('GR-articles')) return 'M3: grammar should unlock after the two-syllable pattern'
    // T17 sentence manipulation gated deep behind grammar/cloze — never eligible up front.
    if (e.eligibleSkills([]).map(s => s.id).includes('SM-editing')) return 'T17: editing must be gated behind grammar/cloze'
    // T12/T01 — sight words + letter-sounds are threaded (every 4th item, rotating), never eligible.
    if (e.eligibleSkills([]).map(s => s.id).includes('HF-words')) return 'T12: HF must be threaded, not eligible'
    if (e.threadedSkill(0) || e.threadedSkill(3)) return 'threaded: none off-cadence'
    // Two threaded skills now (letter-sounds first in scope, then HF) → they rotate every 4th item.
    if (e.threadedSkill(4)?.id !== 'HF-words') return 'threaded: 4th item should be HF (2nd threaded)'
    if (e.threadedSkill(8)?.id !== 'PH-letter-sounds') return 'threaded: 8th item should be letter-sounds (1st threaded)'
    let threads = 0, sawHF = false, sawLS = false
    for (let n = 1; n <= 16; n++) { const t = e.threadedSkill(n); if (t) { threads++; sawHF ||= t.id === 'HF-words'; sawLS ||= t.id === 'PH-letter-sounds' } }
    if (threads !== 4 || !sawHF || !sawLS) return 'threaded: 4 fires per 16, both HF and letter-sounds appear'
    return 'ok'
  })

  // M2 invariants (§10, §11): readiness status + non-destructive export/import round-trip.
  const m2Check = await srsPage.evaluate(async () => {
    const rd = window.__readiness, store = window.__store
    if (!rd || !store) return '__readiness/__store missing'
    if (rd.computeReadiness([], new Set(), [], 10).status !== 'On-Target') return 'readiness: empty → On-Target'
    const wrong = Array.from({ length: 6 }, (_, i) => ({ id: 'w' + i, childId: 'c', skillId: 'PH-cvc-short-vowels', itemId: 'i', correct: false, difficulty: 1, latencyMs: 1, ts: i }))
    if (rd.computeReadiness(wrong, new Set(), [], 10).status !== 'High-Risk') return 'readiness: 6 wrong → High-Risk'
    const before = await store.exportAll()
    if (before.schemaVersion !== 4) return 'export schemaVersion should be 4'
    await store.importAll(before)
    const after = await store.exportAll()
    const count = d => Object.fromEntries(Object.entries(d.stores).map(([k, v]) => [k, v.length]))
    if (JSON.stringify(count(before)) !== JSON.stringify(count(after))) return 'export/import round-trip changed row counts'
    // M3 deterministic scoring: grammar_cloze word-bank + MCQ.
    const sc = window.__scoring
    const cloze = { blanks: [{ id: '1', acceptable: ['to'] }, { id: '2', acceptable: ['because'] }], missedConceptOnFail: 'connector' }
    if (!sc.scoreCloze(cloze, { '1': 'to', '2': 'because' }).correct) return 'scoreCloze: all-correct should pass'
    if (sc.scoreCloze(cloze, { '1': 'to', '2': 'to' }).correct) return 'scoreCloze: wrong blank should fail'
    const mcq = { correctChoiceId: 'b', missedConceptOnFail: 'synonym' }
    if (!sc.scoreMcq(mcq, 'b').correct || sc.scoreMcq(mcq, 'a').correct) return 'scoreMcq'
    // T11 dictation scoring: every word's tiles must match; any wrong word fails.
    const dict = { words: [{ text: 'a', graphemes: ['a'] }, { text: 'cat', graphemes: ['c', 'a', 't'] }], missedConceptOnFail: 'sentence-dictation' }
    if (!sc.scoreDictation(dict, [['a'], ['c', 'a', 't']]).correct) return 'scoreDictation: all-correct should pass'
    if (sc.scoreDictation(dict, [['a'], ['c', 'o', 't']]).correct) return 'scoreDictation: wrong word should fail'
    if (sc.scoreDictation(dict, [['a']]).correct) return 'scoreDictation: missing word should fail'
    // #1 grapheme-level error analysis: a same-length substitution names the EXPECTED grapheme's
    // concept (digraph swap, vowel confusion, b/d reversal → consonant-b); an omission (length
    // mismatch, e.g. a dropped silent-e) falls back to the item's authored tag.
    if (sc.scoreTiles({ graphemes: ['sh', 'i', 'p'], missedConceptOnFail: 'x' }, ['ch', 'i', 'p']).missedConcept !== 'digraph-sh') return '#1 tiles: digraph substitution → digraph-sh'
    if (sc.scoreTiles({ graphemes: ['c', 'a', 't'], missedConceptOnFail: 'x' }, ['c', 'o', 't']).missedConcept !== 'vowel-short-a') return '#1 tiles: vowel substitution → vowel-short-a'
    if (sc.scoreTiles({ graphemes: ['b', 'a', 't'], missedConceptOnFail: 'x' }, ['d', 'a', 't']).missedConcept !== 'consonant-b') return '#1 tiles: b/d reversal → consonant-b'
    if (sc.scoreTiles({ graphemes: ['c', 'a', 'k', 'e'], missedConceptOnFail: 'silent-e-a' }, ['c', 'a', 'k']).missedConcept !== 'silent-e-a') return '#1 tiles: omission → item tag'
    if (sc.scoreDictation({ words: [{ text: 'ship', graphemes: ['sh', 'i', 'p'] }], missedConceptOnFail: 'y' }, [['ch', 'i', 'p']]).missedConcept !== 'digraph-sh') return '#1 dictation: substitution → grapheme concept'
    // M4 gamification: XP = 10/correct + 50/cert; level ≥1 and non-decreasing.
    const g = window.__gamify
    if (g.xp([{ correct: true }, { correct: false }, { correct: true }], [{}, {}]) !== 2 * 10 + 2 * 50) return 'gamify xp'
    if (g.level(0) !== 1 || g.level(1000) < g.level(100)) return 'gamify level'
    const none = g.achievements([], [])
    if (none.length !== 6 || none.some(a => a.earned)) return 'achievements: none earned at zero'
    const some = g.achievements([{ correct: true }], [{}])
    if (!some.find(a => a.id === 'first-cert').earned || !some.find(a => a.id === 'getting-started').earned) return 'achievements: first-cert/getting-started'
    return 'ok'
  })

  await browser.close()
  if (srsCheck !== 'ok') fail('SRS invariant: ' + srsCheck)
  if (engineCheck !== 'ok') fail('engine invariant: ' + engineCheck)
  if (m2Check !== 'ok') fail('M2 invariant: ' + m2Check)

  // Assertions
  for (const r of results) {
    if (r.errors.length) fail(`console errors (${r.WRONG ? 'wrong' : 'correct'}): ${r.errors.slice(0, 3)}`)
    if (r.overflow) fail('horizontal overflow at 390px')
  }
  const good = results.find(r => !r.WRONG)
  // Answering placement correctly places the child above CVC (CVC marked mastered by
  // placement), then the session masters the entry skill and certifies. Assert ≥1
  // certificate and that placement marked CVC decode mastered.
  if (good.db.certs.length < 1) fail(`expected ≥1 certificate on mastery path (after confirmation review), got ${good.db.certs.length}`)
  const cvc = good.db.progress.find(p => p.skillId === 'PH-cvc-short-vowels')
  if (!cvc || cvc.status !== 'mastered') fail('placement: CVC decode should be marked mastered')
  // A1 — the session must honour placement: it should NOT re-serve the CVC skill placement
  // already mastered, i.e. it starts at the entry skill above it.
  if (good.firstSkill === 'PH-cvc-short-vowels') fail('A1: session ignored placement — re-served mastered CVC')
  if (!good.firstSkill) fail('A1: no session item was served on the good path')
  // #3 — a high placement holds back the top rung's SPELLING: the child must earn it in-session,
  // so the first served skill is that encode (SP-*) skill, not a decode one.
  if (!/^SP-/.test(good.firstSkill)) fail(`#3: high placement should serve the held-back encode skill first, got ${good.firstSkill}`)
  // SRS: a spaced review exists after mastery, and passing it (the confirmation session)
  // advanced it past stage 0 — proving the retention gate minted the cert on the review pass.
  if (!(good.db.reviews || []).some(r => r.status === 'scheduled')) fail('SRS: mastering a skill should schedule a review')
  if (!(good.db.reviews || []).some(r => r.stage >= 1)) fail('§7 #1: the confirmation review pass should advance the review past stage 0')
  // M2: sessions write weekly aggregates + a usage/streak row.
  if (!(good.db.aggregates || []).length) fail('M2: session should write weekly aggregates')
  const agg0 = good.db.aggregates[0]
  if (!(agg0.items >= 1 && 'correct' in agg0 && 'minutes' in agg0 && agg0.week)) fail('M2: aggregate row shape')
  const usage0 = (good.db.usage || [])[0]
  if (!(usage0 && usage0.sessionsThisWeek >= 1 && usage0.weeklySessionTarget === 4)) fail('M2: usage/session-count row')
  const bad = results.find(r => r.WRONG)
  if (bad.lessons < 1) fail('struggle path: expected a lesson branch')
  if (bad.db.progress.some(p => p.skillId === 'SP-cvc-short-vowels')) fail('dual gate: encode must stay locked when decode <70%')
  if (bad.db.certs.length) fail('struggle path: no certificate should be awarded')

  console.log('PASS — placement→session, mastery/dual-gate/SRS, M2 dashboard, M3 strands, M4 polish (font toggle+persist, XP/level, settings), zero errors, no overflow')
  stop(); process.exit(0)
} catch (e) { fail((e.stack || e.message || String(e)).split('\n').slice(0, 4).join(' | ')) }
