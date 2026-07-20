# sg-en-reader-tiles

Offline-first English reading & spelling tutor for Singapore Primary (P1–P6), built for learners with decoding/dyslexia difficulties. Fully offline, no accounts, no AI at runtime. Installable to the iPad/iPhone home screen. Full spec: **CLAUDE.md**.

**This is M0** — the proven core loop only: add student → session → one item → feedback → saved. Content (phonics/spelling packs) and the adaptive engine follow in M1+ (see CLAUDE.md §15, §18.3 ledger).

## Put it online (drag-and-drop, no tools)
1. Create a new GitHub repo named exactly **`sg-en-reader-tiles`** (public).
2. On the repo page: **Add file → Upload files**. Drag in **all files and folders** from this project (keep the folder structure — `.github/`, `src/`, `public/`, and the root files). Commit to `main`.
3. Repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Wait for the **Actions** tab to finish (green). Your app is at:
   `https://<your-username>.github.io/sg-en-reader-tiles/`
5. Open that URL in **Safari** on iPad/iPhone → **Share → Add to Home Screen**. Launch from the icon — works offline.

> If drag-drop won't accept folders, install [GitHub Desktop] or use `git`, or drag folder contents one folder at a time. The Actions build does the rest.

## Updating later
Push new code to `main` → Actions rebuilds → the app shows an **"Update available — Refresh"** toast next time it's opened. Tap to update. Version shows at the screen bottom.

## Run locally (optional, needs Node 20)
```
npm install
npm run dev
```

## Notes
- No API keys, no backend, no tracking. All data stays on the device (IndexedDB).
- Personal-use play aid. Content is authored in British/Singapore English.
