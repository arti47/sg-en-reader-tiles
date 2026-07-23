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
    await page.locator('input').first().fill('Test')
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
        if (document.querySelector('.galaxy')) return 'galaxy' // placement now lands in the galaxy hub (M6)
        if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'galaxy') break
      if (kind === 'done') { await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
      const it = await page.evaluate(() => window.__item || null)
      const pick = WRONG ? it.choices.find(c => c.id !== it.correctChoiceId) : it.choices.find(c => c.id === it.correctChoiceId)
      await page.locator('button.tile', { hasText: lbl(pick.label) }).first().click()
      placeCount++
    }
    // M6.2 (§20.2): after placement the child lands in their galaxy hub — planets render, the active
    // one is a tappable learn-planet, and planets past the frontier are locked.
    const gx = await page.evaluate(() => ({
      planets: document.querySelectorAll('.planet').length,
      learn: document.querySelectorAll('.planet-learn').length,
      locked: document.querySelectorAll('.planet-locked').length,
      buddy: document.querySelectorAll('.galaxy-buddy .buddy').length, // M6.3: the child's buddy renders
      arcade: document.querySelectorAll('[aria-label="Fluency Arcade"]').length, // M6.5: opt-in, default off
      cta: document.querySelectorAll('.galaxy-cta button').length // M6.5 fix: explicit Start-mission/Learn CTA
    }))
    if (gx.planets < 1) fail('galaxy: planets should render')
    if (gx.learn < 1) fail('galaxy: the active planet should be a tappable learn-planet')
    if (gx.cta < 1) fail('M6.5 fix: the galaxy must show an explicit mission/learn CTA (Test was unreachable)')
    if (gx.buddy < 1) fail('M6.3: the child buddy should render in the galaxy')
    if (gx.arcade !== 0) fail('M6.5: Fluency Arcade must be OFF by default (no entry on the galaxy)')
    // M6.5 a11y: Calm Mode disables animation (verify the CSS guard on the glowing active planet).
    const calmAnim = await page.evaluate(() => {
      document.documentElement.dataset.calm = 'on'
      const el = document.querySelector('.planet-active'); const a = el ? getComputedStyle(el).animationName : 'none'
      delete document.documentElement.dataset.calm; return a
    })
    if (calmAnim !== 'none') fail('M6.5 a11y: Calm Mode should disable the planet-active animation')
    // A low (struggle-path) placement leaves most planets locked; a high placement may lock none.
    if (WRONG && gx.locked < 1) fail('galaxy: planets past the frontier should be locked')
    // Warm-up must not stop abruptly: at least MIN_WARMUP (6) items even when the child
    // misses the first pair (the reported "ends after two steps" bug).
    if (placeCount < 6) fail(`placement ended after ${placeCount} items (expected ≥6) @ WRONG=${WRONG}`)
    const readDb = () => page.evaluate(() => new Promise(res => {
      const o = indexedDB.open('sg-reader')
      o.onsuccess = () => {
        const t = o.result.transaction(['progress', 'certificates', 'reviews', 'aggregates', 'usage', 'learn', 'wallet'], 'readonly'); const out = {}
        t.objectStore('progress').getAll().onsuccess = e => out.progress = e.target.result
        t.objectStore('certificates').getAll().onsuccess = e => out.certs = e.target.result
        t.objectStore('reviews').getAll().onsuccess = e => out.reviews = e.target.result
        t.objectStore('aggregates').getAll().onsuccess = e => out.aggregates = e.target.result
        t.objectStore('usage').getAll().onsuccess = e => out.usage = e.target.result
        t.objectStore('learn').getAll().onsuccess = e => out.learn = e.target.result
        t.objectStore('wallet').getAll().onsuccess = e => out.wallet = e.target.result
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
          if (/Mission complete/.test(t)) return 'summary'
          if (/Certificate earned!/.test(t)) return 'cert'
          if (/Let's learn this/.test(t)) return 'lesson'
          const hasContinue = [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue')
          const freshTile = document.querySelector('button.tile:not([disabled]), button.word-tile:not([disabled])')
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
        // §3: Test only teaches THREADED skills (sight words / letter-sounds) at first encounter —
        // never a pattern. So any lesson must be immediately followed by a threaded-skill item.
        if (afterLesson) {
          const THREADED = ['HF-words', 'HF-spell', 'PH-letter-sounds']
          if (!THREADED.includes(item.skillId)) fail(`§3: Test lesson must precede a threaded skill, got ${item.skillId} (pattern teaching leaked)`)
          afterLesson = false
        }
        if (item.itemType === 'dictation') {
          // A high placement unlocks dictation rungs (word-by-word sentence build); answer correctly.
          for (let w = 0; w < item.words.length; w++) {
            for (const g of item.words[w].graphemes) await page.locator('button.tile:not([disabled])', { hasText: lbl(g) }).first().click()
            await page.getByRole('button', { name: w < item.words.length - 1 ? 'Next word' : 'Check' }).click()
          }
        } else if (item.itemType === 'grammar_cloze') {
          // Word-bank cloze (unlocked at a high placement): tap the accepted word for each blank.
          for (const b of item.blanks) await page.locator('button.word-tile', { hasText: lbl(b.acceptable[0]) }).first().click()
          await page.getByRole('button', { name: 'Check' }).click()
        } else if (item.graphemes) {
          // Click an ENABLED matching tile each time (words with a repeated grapheme, e.g. p·o·p,
          // reuse the same label — .first() alone would re-target the now-disabled first tile).
          for (const g of item.graphemes) await page.locator('button.tile:not([disabled])', { hasText: lbl(g) }).first().click()
          await page.getByRole('button', { name: 'Check' }).click()
        } else {
          const wrong = answerWrong && item.itemType === 'decode_choice'
          const pick = wrong ? item.choices.find(c => c.id !== item.correctChoiceId).id : item.correctChoiceId
          // Click by choice index — letter-sound tiles carry a keyword sublabel so exact-text match won't hit.
          await page.locator('button.tile').nth(item.choices.findIndex(c => c.id === pick)).click()
          if (wrong) {
            // Error correction (§8): after a wrong answer the child must tap the highlighted correct
            // choice before the item completes (onAnswer/Continue is deferred until then).
            await page.locator('button.tile').nth(item.choices.findIndex(c => c.id === item.correctChoiceId)).click()
          }
        }
        await page.getByRole('button', { name: 'Continue' }).click()
      }
    }
    // M6 (§20.2): the galaxy hub is the child home. These helpers drive it.
    const returnToGalaxy = async () => {
      await page.getByRole('button', { name: 'Done' }).click()
      await page.waitForFunction(() => !!document.querySelector('.galaxy'), { timeout: 6000 })
    }
    const learnActivePlanet = async () => { // tap the glowing (active) learn planet → walk the unit
      await page.locator('.planet-learn').last().click()
      await walkLearn()
    }
    const startMission = async () => { // tap a mission-ready (learned) planet → enter Test
      await page.locator('.planet-test').first().click()
    }
    // M6/M5 (§20.2/§19.6): drive ONE Learn unit to completion (pa→sound→intro→read→spell→text→
    // learned), then click "Back to galaxy". Learn always answers correctly (participation-based).
    let sawSoundCard = false
    let sawPA = false // §3 audit: CVC Learn units open with a phonemic-awareness warm-up (pa_blend/pa_count)
    let sawReadText = false // §3 audit #1: a Learn unit ends by reading a decodable sentence (passage_question)
    let walkedPattern = null // the PH-* pattern actually taught in this Learn walk (for the #1 assertion)
    async function walkLearn() {
      for (let step = 0; step < 80; step++) {
        const kind = await page.waitForFunction(() => {
          const t = document.body.innerText
          if (/Planet explored!|Every planet explored/.test(t)) return 'done'
          if (document.querySelector('.sound-card')) return 'sound' // M5.1 phoneme intro (§19.13)
          if (/Let's learn this/.test(t)) return 'lesson'
          const hasContinue = [...document.querySelectorAll('button')].some(b => b.textContent.trim() === 'Continue')
          const freshTile = document.querySelector('button.tile:not([disabled])')
          return (freshTile && !hasContinue) ? 'item' : null
        }, { timeout: 8000 }).then(h => h.jsonValue())
        if (kind === 'done') { await page.getByRole('button', { name: /Back to (my )?galaxy/ }).click(); return }
        if (kind === 'sound') { sawSoundCard = true; await page.getByRole('button', { name: /Next sound|Let's read/ }).click(); continue }
        if (kind === 'lesson') { await page.getByRole('button', { name: "Let's try" }).click(); continue }
        const it = await page.evaluate(() => window.__item || null)
        if (/^pa_/.test(it.itemType || '')) sawPA = true // phonemic-awareness warm-up item (§3)
        if (it.itemType === 'passage_question') sawReadText = true // connected-text read step (§3 #1)
        if (it.itemType === 'decode_choice' && /^PH-/.test(it.skillId || '')) walkedPattern = it.skillId // the taught pattern
        if (it.graphemes) {
          for (const g of it.graphemes) await page.locator('button.tile:not([disabled])', { hasText: lbl(g) }).first().click()
          await page.getByRole('button', { name: 'Check' }).click()
        } else {
          await page.locator('button.tile').nth(it.choices.findIndex(c => c.id === it.correctChoiceId)).click()
        }
        await page.getByRole('button', { name: 'Continue' }).click()
      }
    }
    // Test now only assesses LEARNED patterns (§19.7) — learn the frontier planet first (we're in
    // the galaxy after placement; tap the active learn-planet).
    await learnActivePlanet()
    // §7 #1 retention gate: the certificate is WITHHELD at acquisition and minted only on the
    // first +2d review pass. So the mastery path (a) plays sessions until a pattern is
    // provisionally mastered (a review is scheduled), asserting NO certificate yet, then
    // (b) backdates that review and plays one more session — passing the due review confirms
    // retention and awards the certificate. #2 (minItems 12) means this spans several sessions.
    const SESSIONS = WRONG ? 1 : 8
    for (let s = 0; s < SESSIONS; s++) {
      await startMission() // tap a mission-ready planet → Test
      await playSession(WRONG)
      db = await readDb()
      if (!WRONG && (db.reviews || []).some(r => r.status === 'scheduled')) break
      if (s < SESSIONS - 1) await returnToGalaxy()
    }
    if (!WRONG) {
      if (!(db.reviews || []).some(r => r.status === 'scheduled')) fail('mastery path: no pattern provisionally mastered (no review scheduled)')
      if (db.certs.length) fail('§7 #1: certificate must NOT be awarded at acquisition (only on the +2d review pass)')
      await returnToGalaxy()
      // Backdate the scheduled reviews so they are due, then confirm on the next session.
      await page.evaluate(() => new Promise(res => {
        const o = indexedDB.open('sg-reader')
        o.onsuccess = () => {
          const t = o.result.transaction('reviews', 'readwrite'); const st = t.objectStore('reviews')
          st.getAll().onsuccess = e => { for (const rv of e.target.result) { rv.due = Date.now() - 1000; st.put(rv) } }
          t.oncomplete = () => res()
        }
      }))
      await startMission()
      await playSession(false)
      // Session-summary highlights (§14): the confirmation minted a certificate, so the summary
      // must surface a "New this session!" award block (child sees achievements immediately).
      const summaryText = await page.evaluate(() => document.body.innerText)
      if (!/New this session/.test(summaryText)) fail('summary: should highlight new awards after earning a certificate')
      // M6.4: the mission reward chest awards coins on open.
      const coinsBeforeChest = (await readDb()).wallet?.[0]?.coins ?? 0
      await page.getByRole('button', { name: /Open your reward chest/ }).click({ force: true }) // force: chest wiggles (infinite anim)
      // The award (addCoins) is async — poll the wallet until it reflects the chest bonus.
      await page.waitForFunction((before) => new Promise(res => {
        const o = indexedDB.open('sg-reader')
        o.onsuccess = () => { o.result.transaction('wallet').objectStore('wallet').getAll().onsuccess = e => res((e.target.result[0]?.coins ?? 0) > before) }
      }), coinsBeforeChest, { timeout: 6000 }).catch(() => fail('M6.4: opening the chest should award coins'))
      db = await readDb()
      // Child-facing trophy room, reached from the summary → shows badges + the earned certificate.
      await page.getByRole('button', { name: /My trophies/ }).click()
      await page.waitForFunction(() => /trophies/i.test(document.body.innerText), { timeout: 6000 })
      const troText = await page.evaluate(() => document.body.innerText)
      if (!/My badges/.test(troText)) fail('trophies: badges section missing')
      if (!/My certificates/.test(troText) || !/I can/.test(troText)) fail('trophies: earned certificate missing')
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fail('trophies: horizontal overflow at 390px')
    } else {
      // §19.7 (updated per report "re-entering a finished planet and quitting wipes my progress"):
      // a bad Test round NO LONGER reverts the finished planet on the galaxy — it stays explored.
      // Test records an internal needs-review HINT and offers a "📘 Learn it again" button on the
      // summary; re-teaching is the child's choice, not an automatic demotion.
      db = await readDb()
      const cvc0 = (db.learn || []).find(r => r.patternId === 'PH-cvc-1')
      if (!cvc0 || !cvc0.learned) fail('struggle must NOT un-learn the finished pattern')
      if (!cvc0.needsReview) fail('struggle should record an internal needs-review hint')
      // The fix: patternStatus keeps a learned pattern EXPLORED (never 'needs-review'), so the galaxy
      // planet does not revert even while flagged.
      const st = await page.evaluate(() =>
        window.__learn.patternStatus('PH-cvc-1', [{ patternId: 'PH-cvc-1', learned: true, needsReview: true }], false))
      if (st !== 'learned') fail(`patternStatus: a learned+needsReview pattern must stay 'learned', got '${st}'`)
      // Re-teach is user-initiated from the summary; it resurfaces the flagged pattern → clears the hint.
      await page.getByRole('button', { name: /Learn it again/ }).click()
      await walkLearn()
      db = await readDb()
      const cvc = (db.learn || []).find(r => r.patternId === 'PH-cvc-1')
      if (!cvc || cvc.needsReview) fail('re-learning should clear the needs-review hint')
      if (!cvc.learned) fail('the re-learned pattern should stay learned')
    }
    results.push({ WRONG, errors, overflow, lessons, db, firstSkill, sawSoundCard, sawPA, sawReadText, walkedPattern })
    await ctx.close()
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
      await op.locator('input').first().fill(nm)
      await op.getByRole('button', { name: 'P1', exact: true }).click()
      await op.getByRole('button', { name: 'Save' }).click()
      for (let i = 0; i < 30; i++) {
        const kind = await op.waitForFunction(() => {
          if (document.querySelector('.galaxy')) return 'galaxy'
          if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
          return document.querySelector('button.tile:not([disabled])') ? 'item' : null
        }, { timeout: 8000 }).then(h => h.jsonValue())
        if (kind === 'galaxy') break
        if (kind === 'done') { await op.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
        await op.locator('button.tile:not([disabled])').first().click()
      }
      // M6: placement lands in the galaxy hub — return to the picker to add the next child + check cards.
      await op.getByRole('button', { name: /Back/ }).click()
      await op.waitForFunction(() => /Who's reading\?/.test(document.body.innerText), { timeout: 6000 })
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
    await dp.locator('input').first().fill('Dash')
    await dp.getByRole('button', { name: 'P2', exact: true }).click()
    await dp.getByRole('button', { name: 'Save' }).click()
    for (let i = 0; i < 30; i++) {
      const kind = await dp.waitForFunction(() => {
        if (document.querySelector('.galaxy')) return 'galaxy'
        if ([...document.querySelectorAll('button')].some(b => b.textContent.trim() === "Let's read")) return 'done'
        return document.querySelector('button.tile:not([disabled])') ? 'item' : null
      }, { timeout: 8000 }).then(h => h.jsonValue())
      if (kind === 'galaxy') break
      if (kind === 'done') { await dp.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === "Let's read")?.click()); continue }
      await dp.locator('button.tile:not([disabled])').first().click()
    }
    // M6: placement lands in the galaxy hub — return to the picker for the teacher-area entry.
    await dp.getByRole('button', { name: /Back/ }).click()
    await dp.waitForFunction(() => /Who's reading\?/.test(document.body.innerText), { timeout: 6000 })
    // M4: picker card shows the gamification level badge.
    if (!/Lvl/.test(await dp.evaluate(() => document.body.innerText))) fail('M4 gamify: picker should show a level badge')
    // Student management moved OFF the home screen (§14): no "Manage" button on the picker.
    if (await dp.getByRole('button', { name: 'Manage' }).count()) fail('picker: Manage should be removed from the home screen')
    await dp.getByRole('button', { name: /teacher area/i }).click()
    await dp.waitForFunction(() => /Create a teacher PIN/.test(document.body.innerText), { timeout: 6000 })
    for (const d of ['1', '2', '3', '4']) await dp.getByRole('button', { name: d, exact: true }).click()
    await dp.waitForFunction(() => /Re-enter to confirm/.test(document.body.innerText), { timeout: 6000 })
    for (const d of ['1', '2', '3', '4']) await dp.getByRole('button', { name: d, exact: true }).click()
    await dp.waitForFunction(() => /Teacher area/.test(document.body.innerText) && /skills mastered/.test(document.body.innerText), { timeout: 6000 })
      .catch(() => fail('dashboard: card did not render after PIN'))
    if (!/Dash/.test(await dp.evaluate(() => document.body.innerText))) fail('dashboard: child card missing')
    if (!/badges/.test(await dp.evaluate(() => document.body.innerText))) fail('M4 gamify: dashboard should show achievement badges')
    if (!/What's going on/.test(await dp.evaluate(() => document.body.innerText))) fail('M7.1: dashboard should show the diagnostic finding')
    // Trend granularity toggle: Daily/Weekly/Monthly/Yearly present; switching to Daily works.
    for (const g of ['Daily', 'Weekly', 'Monthly', 'Yearly']) {
      if (!(await dp.getByRole('tab', { name: g }).count())) fail(`dashboard: missing ${g} trend toggle`)
    }
    await dp.getByRole('tab', { name: 'Daily' }).click()
    await dp.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent === 'Daily', { timeout: 6000 })
      .catch(() => fail('dashboard: Daily toggle did not select'))
    const dOverflow = await dp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    if (dOverflow) fail('dashboard: horizontal overflow at 390px')
    const [dl] = await Promise.all([
      dp.waitForEvent('download', { timeout: 5000 }).catch(() => null),
      dp.getByRole('button', { name: 'Export backup' }).click()
    ])
    if (!dl) fail('dashboard: export backup did not download')
    // Remove student now lives in the Teacher area (§14): two-tap inline confirm, then the card
    // disappears. (The Settings/Backup cards remain, so the font checks below still run.)
    await dp.getByRole('button', { name: 'Remove Dash' }).click()  // reveal confirm
    await dp.getByRole('button', { name: 'Remove', exact: true }).click() // confirm
    await dp.waitForFunction(() => !/skills mastered/.test(document.body.innerText), { timeout: 6000 })
      .catch(() => fail('teacher area: remove student did not delete the card'))
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
    // Error correction (§8): build a WRONG spelling, then rebuild the revealed model → "Good fixing!".
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const spellBox = mp3.locator('[data-testid="m3-spell"]')
    const sg = m3.spell.graphemes
    const order = [...sg]; [order[0], order[1]] = [order[1], order[0]] // swap first two → wrong, same length
    for (const g of order) await spellBox.locator('button.tile:not([disabled])', { hasText: new RegExp('^' + esc(g) + '$') }).first().click()
    await spellBox.getByRole('button', { name: 'Check' }).click()
    await spellBox.locator('.model-word').waitFor({ timeout: 6000 }).catch(() => fail('m3 spell: correction should reveal the model word'))
    for (const g of sg) await spellBox.locator('button.tile:not([disabled])', { hasText: new RegExp('^' + esc(g) + '$') }).first().click()
    if (!/Good fixing/.test(await spellBox.innerText())) fail('m3 spell: rebuilding the model should complete the correction')
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
    const PH = 'PH-cvc-1', SP = 'SP-cvc-1'
    const dec = gs(PH)
    // #2 — foundational decode/encode need 12 items (overlearning): 8 must NOT master.
    if (e.skillMastered(arr(PH, 8, true), dec)) return '#2 minItems: 8 items must not master (raised to 12)'
    // A2 — a pattern needs BOTH decode and encode; decode alone must not pass.
    const decodeOnly = arr(PH, 12, true)
    if (!e.skillMastered(decodeOnly, dec)) return 'A2 decode should master'
    if (e.patternMastered(decodeOnly, dec)) return 'A2 pattern must NOT pass on decode alone'
    if (!e.patternMastered([...decodeOnly, ...arr(SP, 12, true)], dec)) return 'A2 pattern should pass with both'
    // A2 advancement gate — with only the cvc-1 pattern's decode mastered, the next decode skill
    // (cvc-2) must NOT be eligible (its encode partner is); it unlocks only once cvc-1 is fully done.
    const decElig = e.eligibleSkills(decodeOnly).map(s => s.id)
    if (decElig.includes('PH-cvc-2')) return 'A2 advancement: cvc-2 unlocked on decode alone'
    if (!decElig.includes(SP)) return 'A2 encode partner should be eligible at ≥70% decode'
    if (!e.eligibleSkills([...decodeOnly, ...arr(SP, 12, true)]).map(s => s.id).includes('PH-cvc-2')) return 'A2 advancement: cvc-2 should unlock after full pattern'
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
    // #7 — encode must not unlock on a tiny lucky streak; needs ≥6 real decode items at ≥70%.
    if (e.encodeUnlocked(arr(PH, 3, true), dec)) return '#7 encode must not unlock on <6 items'
    if (!e.encodeUnlocked(arr(PH, 6, true), dec)) return '#7 encode should unlock at 6 items ≥70%'
    // #2 fluency loop: a mastered pattern read ACCURATELY but SLOWLY (median latency > maxMs) is
    // served for automaticity reps on cadence; a fast one, or off-cadence, is not.
    const slow = arr(PH, 12, true).map(a => ({ ...a, latencyMs: 9000 }))
    if (e.fluencySkill(slow, 6, 7000)?.id !== PH) return '#2 fluency: slow mastered skill should be served on cadence'
    if (e.fluencySkill(slow, 3, 7000)) return '#2 fluency: nothing off-cadence'
    if (e.fluencySkill(arr(PH, 12, true), 6, 7000)) return '#2 fluency: a fast mastered skill should not be served'
    if (e.fluencySkill(slow, 6, 7000, undefined, 6) && e.fluencySkill(slow, 5, 7000)) return '#2 fluency: respects the every param'
    // #1 support: difficulty flags tune pacing (dyslexia = more conservative); no flags = defaults.
    const sp = window.__support
    if (sp) {
      const def = sp.support(), dys = sp.support(['dyslexia']), flu = sp.support(['fluency'])
      if (def.interleaveEvery !== 5 || def.placementPerSkill !== 3 || def.promoteStreak !== 3 || def.guidedItems !== 3) return '#1 support: no-flags must equal defaults'
      if (!(dys.placementPerSkill > def.placementPerSkill && dys.promoteStreak > def.promoteStreak && dys.interleaveEvery < def.interleaveEvery)) return '#1 support: dyslexia should be more conservative'
      // #3/#4 — a dyslexia/decoding flag shortens the session and stiffens the coarse placement PER.
      if (def.sessionLength !== 16 || def.placementCoarsePer !== 2) return 'support: session/coarse defaults (16/2)'
      if (!(dys.sessionLength < def.sessionLength && dys.placementCoarsePer > def.placementCoarsePer)) return 'support: dyslexia → shorter session + stricter coarse placement'
      if (!(flu.fluencyMaxMs < def.fluencyMaxMs)) return '#1 support: fluency flag should lower the fluency threshold'
      // Regression: interleave shares slots with the HF thread (THREAD_EVERY=4, checked first),
      // so a flag-tuned interleaveEvery that collides with 4 yields FEWER reviews, not more.
      // Effective review count (thread wins its slots) must be ≥ the no-flag default.
      const eff = (i) => { let n = 0; for (let c = 1; c < 16; c++) { if (c % 4 === 0) continue; if (c % i === 0) n++ } return n }
      if (eff(dys.interleaveEvery) < eff(def.interleaveEvery)) return '#1 support: dyslexia interleave shadowed by thread cadence (fewer reviews than default)'
      if (eff(flu.interleaveEvery) < eff(def.interleaveEvery)) return '#1 support: fluency interleave shadowed by thread cadence'
    }
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
    if (e.eligibleSkills([]).map(s => s.id).includes('PH-cvc-1') === false) return 'T01: CVC should be eligible up front (it is the floor)'
    // M3 gating (§5) — grammar unlocks only after the decode ladder (PH-two-syllable pattern).
    if (e.eligibleSkills([]).map(s => s.id).includes('GR-articles')) return 'M3: grammar must be gated behind decoding'
    const decoded = [...arr('PH-two-syllable', 12, true), ...arr('SP-two-syllable', 12, true)]
    if (!e.eligibleSkills(decoded).map(s => s.id).includes('GR-articles')) return 'M3: grammar should unlock after the two-syllable pattern'
    // T19 connected-text reading (word→text bridge) gated behind the CVC pattern — not up front,
    // eligible once CVC read+spell is mastered.
    if (e.eligibleSkills([]).map(s => s.id).includes('RD-cvc-sentences')) return 'T19: reading must be gated behind the CVC pattern'
    if (!e.eligibleSkills([...arr('PH-cvc-4', 12, true), ...arr('SP-cvc-4', 12, true)]).map(s => s.id).includes('RD-cvc-sentences')) return 'T19: reading should unlock after the CVC pattern (cvc-4)'
    // T19 digraph-level reading gated behind the DIGRAPH pattern.
    if (e.eligibleSkills([]).map(s => s.id).includes('RD-digraph-sentences')) return 'T19: digraph reading must be gated behind the digraph pattern'
    if (!e.eligibleSkills([...arr('PH-digraphs', 12, true), ...arr('SP-digraphs', 12, true)]).map(s => s.id).includes('RD-digraph-sentences')) return 'T19: digraph reading should unlock after the digraph pattern'
    // M5 (§19.5) — Learn frontier + Test learned-gate. `nextToLearn` walks the pattern ladder;
    // `eligibleSkills(...,learnedPatterns)` gates dual-gated PATTERN skills by learned (non-pattern
    // reading/M3 skills are NOT gated). Omitting the arg keeps pre-M5 behaviour.
    const L = window.__learn
    if (L) {
      if (L.nextToLearn(new Set())?.id !== 'PH-cvc-1') return 'M5 nextToLearn: empty → CVC frontier'
      if (L.nextToLearn(new Set(['PH-cvc-1']))?.id !== 'PH-cvc-2') return 'M5 nextToLearn: cvc-1 learned → cvc-2 frontier'
      const full = [...arr(PH, 12, true), ...arr(SP, 12, true), ...arr('PH-cvc-4', 12, true), ...arr('SP-cvc-4', 12, true)] // cvc-1 + cvc-4 patterns mastered
      if (e.eligibleSkills(full, undefined, new Set()).some(s => s.encodePairId)) return 'M5 gate: no pattern skill eligible when nothing learned'
      if (!e.eligibleSkills(full, undefined, new Set(['PH-cvc-2'])).map(s => s.id).includes('PH-cvc-2')) return 'M5 gate: cvc-2 eligible once its pattern is learned'
      if (!e.eligibleSkills(full, undefined, new Set()).map(s => s.id).includes('RD-cvc-sentences')) return 'M5 gate: non-pattern reading must NOT be learned-gated'
    }
    // M5.1 (§19.13) — phoneme sound metadata: 44 rows, all clip ids resolvable; per-pattern new
    // sounds + "same sound, new spelling" links; introduced set derives from learned patterns.
    const SN = window.__sounds
    if (SN) {
      if (SN.SOUNDS.length !== 44) return 'M5.1 sounds: expected 44 phonemes'
      if (SN.newSoundsFor('PH-digraphs').map(s => s.id).join(',') !== 'sh,ch,th-unvoiced,th-voiced') return 'M5.1: digraphs introduce sh/ch/th sounds'
      if (SN.newSoundsFor('PH-blends').length !== 0) return 'M5.1: blends introduce no new sound'
      // /ai/ is first taught at silent-e; vowel-teams adds new SPELLINGS (ai/ay) of that known sound.
      if (!SN.newSpellingsFor('PH-vowel-teams-a').some(x => x.sound.id === 'ai' && x.graphemes.includes('ai'))) return 'M5.1: vowel-teams = new spelling of /ai/'
      if (SN.newSpellingsFor('PH-silent-e').length !== 0) return 'M5.1: silent-e introduces, not re-spells'
      const intro = SN.introducedSounds(new Set(['PH-cvc-1', 'PH-digraphs']))
      if (!intro.some(s => s.id === 'sh') || intro.some(s => s.id === 'ai')) return 'M5.1: introduced set follows learned patterns (no spoilers)'
      // T20/T21 orphan-sound units are now authored → their sound rows are live (§19.13.5).
      if (SN.newSoundsFor('PH-ng').map(s => s.id).join(',') !== 'ng') return 'T20: PH-ng introduces the /ng/ sound'
      if (SN.newSoundsFor('PH-r-vowel-teams').map(s => s.id).join(',') !== 'ear,air,ure') return 'T21: r-vowel-teams introduces ear/air/ure'
      if (!gs('PH-ng') || !gs('PH-r-vowel-teams')) return 'T20/T21: scope skills should resolve'
    }
    // T17 sentence manipulation gated deep behind grammar/cloze — never eligible up front.
    if (e.eligibleSkills([]).map(s => s.id).includes('SM-editing')) return 'T17: editing must be gated behind grammar/cloze'
    // T12/T01 — sight words (read + spell) + letter-sounds are threaded (every 4th item, rotating),
    // never eligible in the normal rotation.
    if (e.eligibleSkills([]).map(s => s.id).includes('HF-words')) return 'T12: HF must be threaded, not eligible'
    if (e.eligibleSkills([]).map(s => s.id).includes('HF-spell')) return '#2: HF-spell must be threaded, not eligible'
    if (e.threadedSkill(0) || e.threadedSkill(3)) return 'threaded: none off-cadence'
    // Three threaded skills now in scope order — letter-sounds, HF-words, HF-spell — rotate every 4th.
    if (e.threadedSkill(4)?.id !== 'HF-words') return 'threaded: 4th item should be HF-words'
    if (e.threadedSkill(8)?.id !== 'HF-spell') return 'threaded: 8th item should be HF-spell'
    if (e.threadedSkill(12)?.id !== 'PH-letter-sounds') return 'threaded: 12th item should be letter-sounds'
    let threads = 0, sawHF = false, sawLS = false, sawHFsp = false
    for (let n = 1; n <= 16; n++) { const t = e.threadedSkill(n); if (t) { threads++; sawHF ||= t.id === 'HF-words'; sawLS ||= t.id === 'PH-letter-sounds'; sawHFsp ||= t.id === 'HF-spell' } }
    if (threads !== 4 || !sawHF || !sawLS || !sawHFsp) return 'threaded: 4 fires per 16; HF-words, HF-spell, letter-sounds all appear'
    return 'ok'
  })

  // M2 invariants (§10, §11): readiness status + non-destructive export/import round-trip.
  const m2Check = await srsPage.evaluate(async () => {
    const rd = window.__readiness, store = window.__store
    if (!rd || !store) return '__readiness/__store missing'
    if (rd.computeReadiness([], new Set(), [], 10).status !== 'On-Target') return 'readiness: empty → On-Target'
    // No assessment data → recentAccuracy is null (shown as "—"), never a misleading 100%.
    if (rd.computeReadiness([], new Set(), [], 10).growth.recentAccuracy !== null) return 'readiness: empty → null accuracy (not 100%)'
    const wrong = Array.from({ length: 6 }, (_, i) => ({ id: 'w' + i, childId: 'c', skillId: 'PH-cvc-1', itemId: 'i', correct: false, difficulty: 1, latencyMs: 1, ts: i }))
    if (rd.computeReadiness(wrong, new Set(), [], 10).status !== 'High-Risk') return 'readiness: 6 wrong → High-Risk'
    // Non-assessment REPS (review:true) must be EXCLUDED from the headline accuracy — 6 wrong
    // assessment items stay High-Risk even with 30 easy correct reps mixed in (the inflation bug).
    const reps = Array.from({ length: 30 }, (_, i) => ({ id: 'r' + i, childId: 'c', skillId: 'PH-cvc-1', itemId: 'i', correct: true, difficulty: 1, latencyMs: 1, ts: 100 + i, review: true }))
    const mixed = rd.computeReadiness([...wrong, ...reps], new Set(), [], 10)
    if (mixed.status !== 'High-Risk') return 'readiness: reps must not inflate status out of High-Risk'
    if (mixed.growth.recentAccuracy !== 0) return 'readiness: reps must be excluded from recent accuracy'
    if (mixed.growth.assessedN !== 6) return 'readiness: assessedN should count assessment items only'
    // M7.1 (§21.2 A): decode/spell struggle diagnostic (pure classify, self-gating).
    const dg = window.__diagnose
    const DNOW = Date.parse('2026-07-23T00:00:00Z')
    const dgMk = (n, correct, mc) => Array.from({ length: n }, () => ({ correct, missedConcept: mc, review: false }))
    if (dg.diagnose([...dgMk(15, true)], [], DNOW).primary !== null) return 'diagnose: a typical reader must not be flagged'
    if (dg.diagnose([...dgMk(5, false, 'x')], [], DNOW).primary !== null) return 'diagnose: <MIN_ASSESSED must not diagnose'
    // acquisition: low accuracy, misses SPREAD so confusion does not also trip.
    const dgSpread = ['a', 'b', 'c', 'd', 'e'].flatMap(c => [{ correct: false, missedConcept: c, review: false }, { correct: false, missedConcept: c, review: false }])
    if (dg.diagnose([...dgMk(6, true), ...dgSpread], [], DNOW).primary !== 'acquisition') return 'diagnose: low accuracy → acquisition'
    // retention: accurate but past-due, un-advanced (stage-0) reviews pile up.
    const dgStuck = [{ skillId: 'PH-cvc-1', stage: 0, status: 'scheduled', due: DNOW - 1000 }, { skillId: 'SP-cvc-1', stage: 0, status: 'scheduled', due: DNOW - 1000 }]
    if (dg.diagnose([...dgMk(15, true)], dgStuck, DNOW).primary !== 'retention') return 'diagnose: past-due stage-0 reviews → retention'
    if (dg.diagnose([...dgMk(15, true)], [{ skillId: 'x', stage: 0, status: 'scheduled', due: DNOW + 1e5 }], DNOW).primary !== null) return 'diagnose: a not-yet-due review must not signal retention'
    // confusion: accurate overall but one miss concept dominates.
    const dConf = dg.diagnose([...dgMk(12, true), ...dgMk(3, false, 'digraph-sh')], [], DNOW)
    if (dConf.primary !== 'confusion' || !dConf.stuckConcepts.includes('digraph-sh')) return 'diagnose: a dominant miss concept → confusion'
    // reps excluded from the signal (a struggling child cannot be masked by easy reps).
    const dgReps = Array.from({ length: 9 }, () => ({ correct: false, missedConcept: 'z', review: true }))
    if (dg.diagnose([...dgMk(12, true), ...dgReps], [], DNOW).primary !== null) return 'diagnose: non-assessment reps must be excluded'
    // M7.2 (§21.2 B): auto-adapt maps the diagnosis → ADDITIVE deltas (self-gating; bar frozen).
    const ad = window.__adapt
    const aTyp = ad.adaptFor(dg.diagnose([...dgMk(15, true)], [], DNOW))
    if (aTyp.paBonus || aTyp.guidedBonus || aTyp.dueCapBonus || aTyp.extraReviewStage) return 'adapt: a typical reader must get NO adaptation'
    const aRet = ad.adaptFor(dg.diagnose([...dgMk(15, true)], dgStuck, DNOW))
    if (aRet.dueCapBonus <= 0 || !aRet.extraReviewStage) return 'adapt: retention → more due reviews + an extra SRS stage'
    const aAcq = ad.adaptFor(dg.diagnose([...dgMk(6, true), ...dgSpread], [], DNOW))
    if (aAcq.paBonus <= 0 || aAcq.guidedBonus <= 0) return 'adapt: acquisition → more PA + a longer guided block'
    // The extra SRS stage is conservative-only: it demands ONE MORE retrieval, never an easier bar.
    const srs = window.__srs
    let rv0 = { skillId: 'z', stage: 0, due: 0, status: 'scheduled' }
    rv0 = srs.onReviewPass(rv0, DNOW); rv0 = srs.onReviewPass(rv0, DNOW) // → stage 2, scheduled
    if (srs.onReviewPass(rv0, DNOW).status !== 'graduated') return 'srs: default graduates after 3 stages'
    const ext = srs.onReviewPass(rv0, DNOW, 4)
    if (ext.status !== 'scheduled') return 'srs: extra stage should schedule one more review, not graduate'
    if (srs.onReviewPass(ext, DNOW, 4).status !== 'graduated') return 'srs: graduates after the extra stage'
    const before = await store.exportAll()
    if (before.schemaVersion !== 9) return 'export schemaVersion should be 9 (M6.4 dailygoal)'
    // M6.4 (§20.4): daily-goal progress + streak math (pure).
    const ec = window.__economy
    const g0 = { childId: 'g', day: '2026-07-23', progress: 0, target: ec.DAILY_TARGET, streak: 0, lastGoalDay: '' }
    const r1 = ec.progressGoal(g0, '2026-07-23', ec.DAILY_TARGET) // reach target in one go
    if (!r1.justCompleted || r1.goal.streak !== 1 || r1.bonus <= 0) return 'M6.4: reaching the target should complete the goal + streak 1 + bonus'
    const r2 = ec.progressGoal(r1.goal, '2026-07-23', 10) // same day, already done → no re-complete
    if (r2.justCompleted) return 'M6.4: goal completes once per day'
    const r3 = ec.progressGoal(r1.goal, '2026-07-24', ec.DAILY_TARGET) // next day → streak 2
    if (!r3.justCompleted || r3.goal.streak !== 2) return 'M6.4: consecutive-day completion should extend the streak'
    const r4 = ec.progressGoal(r1.goal, '2026-07-26', ec.DAILY_TARGET) // gap → streak resets to 1
    if (r4.goal.streak !== 1) return 'M6.4: a gap should reset the streak to 1'
    // M6.3 (§20.3): shop buy→own→equip round-trip (cosmetic-only; store-level, deterministic).
    await store.addCoins('shopc', 100)
    const bought = await store.buyCosmetic('shopc', 'colour-sun', 30)
    if (!bought.inv.owned.includes('colour-sun')) return 'shop: buy should add the item to owned'
    if (bought.wallet.coins !== 70) return 'shop: buy should deduct the cost from coins'
    const again = await store.buyCosmetic('shopc', 'colour-sun', 30) // idempotent — no double charge
    if (again.wallet.coins !== 70) return 'shop: re-buying an owned item must not charge again'
    // Expanded catalogue (§20.3): buy a second-slot item (a pet) and equip BOTH slots at once.
    const pet = await store.buyCosmetic('shopc', 'pet-star', 60)
    if (!pet.inv.owned.includes('pet-star') || pet.wallet.coins !== 10) return 'shop: second-slot (pet) buy should own + deduct'
    await store.putInventory({ ...pet.inv, equipped: { colour: 'colour-sun', pet: 'pet-star' } })
    const eq = (await store.getInventory('shopc')).equipped
    if (eq.colour !== 'colour-sun' || eq.pet !== 'pet-star') return 'shop: multi-slot equip (colour + pet) should persist'
    // Trend summary (§11): summarise buckets weekly aggregates by day/week/month/year.
    const agg = window.__aggregate
    const aggs = [{ week: '2026-W29', items: 4, correct: 3 }, { week: '2026-W29', items: 2, correct: 2 }, { week: '2026-W30', items: 5, correct: 4 }]
    const dyl = [{ day: '2026-07-20', items: 3, correct: 2 }, { day: '2026-07-21', items: 6, correct: 5 }]
    const wk = agg.summarise(aggs, dyl, 'week')
    if (wk.length !== 2 || wk[0].items !== 6 || wk[1].items !== 5) return 'summarise week: group+sum by week'
    const mo = agg.summarise(aggs, dyl, 'month')
    if (mo.length !== 1 || mo[0].items !== 11) return 'summarise month: sum all July weeks'
    const dd = agg.summarise(aggs, dyl, 'day')
    if (dd.length !== 2 || dd[1].label !== '21 Jul' || dd[1].items !== 6) return 'summarise day: from daily rows'
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
    // M5 (§19.4) learn store round-trip: setLearned → flagReview → clearReview.
    await store.setLearned('c5', 'PH-cvc-1')
    let lr = await store.getLearn('c5')
    if (!lr.some(r => r.patternId === 'PH-cvc-1' && r.learned)) return 'M5 store: setLearned'
    await store.flagReview('c5', 'PH-cvc-1')
    if (!(await store.getLearn('c5'))[0].needsReview) return 'M5 store: flagReview'
    await store.clearReview('c5', 'PH-cvc-1')
    if ((await store.getLearn('c5'))[0].needsReview) return 'M5 store: clearReview'
    return 'ok'
  })

  // §18.11: every enabled scope skill's pack must be wired at runtime (unimported pack → pickItem
  // returns nothing → session aborts). Captured while srsPage is still open.
  const unwired = await srsPage.evaluate(() => window.__unwiredSkills || ['<missing hook>'])

  await browser.close()
  if (unwired.length) fail('pack wiring: enabled skills with no runtime items (unimported pack?): ' + unwired.join(', '))
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
  const cvc = good.db.progress.find(p => p.skillId === 'PH-cvc-1')
  if (!cvc || cvc.status !== 'mastered') fail('placement: CVC decode should be marked mastered')
  // A1 — the session must honour placement: it should NOT re-serve the CVC skill placement
  // already mastered, i.e. it starts at the entry skill above it.
  if (good.firstSkill === 'PH-cvc-1') fail('A1: session ignored placement — re-served mastered CVC')
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
  // M5 (§19.7): teaching moved to Learn — Test fires NO lessons; and the child LEARNED a pattern
  // in Learn before Test could assess it.
  // §3: Test may teach the THREADED sight-word / letter-sounds method once (at first encounter);
  // that a lesson only ever precedes a threaded item is enforced per-lesson in playSession above.
  // Pattern re-teaching stays out of Test (no lesson followed by a pattern item → no fail there).
  if (!(good.db.learn || []).some(r => r.learned)) fail('M5: Learn should have marked a pattern learned')
  // M6.1 (§20.4): correct assessment answers earn Star Coins (cosmetic reward; pedagogy untouched).
  if (!(good.db.wallet || []).some(w => w.coins > 0)) fail('M6.1: correct answers should earn Star Coins')
  // M6.5 fix: completing a Learn unit also earns stars (so a learn-heavy struggling reader — the
  // struggle path — can still earn, even without reaching a mission).
  if (!(bad.db.wallet || []).some(w => w.coins > 0)) fail('M6.5 fix: learning a planet should earn Star Coins')
  if (bad.db.progress.some(p => p.skillId === 'SP-cvc-1')) fail('dual gate: encode must stay locked when decode <70%')
  if (bad.db.certs.length) fail('struggle path: no certificate should be awarded')
  // M5.1 (§19.13): the CVC Learn unit (struggle-path frontier) opens with phoneme sound-intro cards.
  if (!bad.sawSoundCard) fail('M5.1: CVC Learn unit should show phoneme sound-intro cards before reading')
  // §3 audit: the CVC Learn unit opens with a phonemic-awareness (oral blend/count) warm-up.
  if (!bad.sawPA) fail('§3: CVC Learn unit should show a phonemic-awareness warm-up (pa_blend/pa_count)')
  // §3 audit #1: when the pattern actually TAUGHT in a Learn walk is reading-bearing, that unit must
  // end with a connected-text read (passage_question). Keyed to the walked pattern, not placement-
  // credited patterns, so it's deterministic.
  const READING_PATTERNS = ['PH-cvc-4', 'PH-digraphs', 'PH-blends', 'PH-silent-e', 'PH-vowel-teams-b', 'PH-r-controlled-b', 'PH-diphthongs-b', 'PH-two-syllable']
  for (const r of [good, bad]) {
    if (READING_PATTERNS.includes(r.walkedPattern) && !r.sawReadText) fail(`§3 #1: Learn unit for reading-bearing ${r.walkedPattern} should read a sentence (WRONG=${r.WRONG})`)
  }

  console.log('PASS — placement→session, mastery/dual-gate/SRS, M2 dashboard, M3 strands, M4 polish (font toggle+persist, XP/level, settings), zero errors, no overflow')
  stop(); process.exit(0)
} catch (e) { fail((e.stack || e.message || String(e)).split('\n').slice(0, 4).join(' | ')) }
