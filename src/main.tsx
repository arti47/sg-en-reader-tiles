import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Self-hosted, offline-bundled fonts (§14). Lexend is the reading-friendly default;
// OpenDyslexic is an opt-in (Settings). woff2 is precached by the service worker.
import '@fontsource/lexend/400.css'
import '@fontsource/lexend/700.css'
import '@fontsource/opendyslexic/400.css'
import '@fontsource/opendyslexic/700.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>
)
