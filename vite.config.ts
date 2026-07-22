import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// Minimal typing for the Node build env (no @types/node dependency — this config runs in Node).
declare const process: { env: Record<string, string | undefined> }

// Single source of truth for the visible version (§13, §18.6): package.json.
const version = pkg.version

// Base path depends on WHERE we deploy (§13):
//  • GitHub Pages serves under /sg-en-reader-tiles/ (repo-name subpath) → base must match, or
//    every asset URL 404s and the page renders blank.
//  • Netlify (and Vercel, or any root-domain host) serves from '/'. Netlify sets NETLIFY=true in
//    its build env, so we auto-pick '/' there. Override anywhere with BASE_PATH.
const base = process.env.BASE_PATH ?? (process.env.NETLIFY ? '/' : '/sg-en-reader-tiles/')

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // drives the "Update available" toast
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'SG English Reader',
        short_name: 'Reader',
        description: 'Offline reading & spelling tutor (Singapore primary)',
        theme_color: '#1f6f6b',
        background_color: '#faf7f0',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,json,woff2,mp3,m4a}'], // m4a = phoneme clips (§6c)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
      }
    })
  ]
})
