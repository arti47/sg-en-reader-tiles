import { registerSW } from 'virtual:pwa-register'
// "Update available" toast wiring (CLAUDE.md §13). Never auto-reload mid-session.
export function initPWA(onUpdate: (reload: () => void) => void) {
  const updateSW = registerSW({
    onNeedRefresh() { onUpdate(() => updateSW(true)) },
    onOfflineReady() { /* precached; runs offline */ }
  })
}
