import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json'

// Single source of truth for the visible version (§13, §18.6): package.json.
const version = pkg.version

// Repo name → GitHub Pages base path.
export default defineConfig({
  base: '/sg-en-reader-tiles/',
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
        start_url: '/sg-en-reader-tiles/',
        scope: '/sg-en-reader-tiles/',
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
