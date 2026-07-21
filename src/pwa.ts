import { registerSW } from 'virtual:pwa-register'
// "Update available" toast wiring (CLAUDE.md §13). Never auto-reload mid-session.
export function initPWA(onUpdate: (reload: () => void) => void) {
  const updateSW = registerSW({
    onNeedRefresh() { onUpdate(() => updateSW(true)) },
    onOfflineReady() { /* precached; runs offline */ }
  })
  // Cache pre-warm / update check when the app is foregrounded (§13). Never auto-reloads;
  // a waiting SW still surfaces via the toast above.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => {})
  })
}
