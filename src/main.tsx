import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isFirebaseConfigured } from './lib/syncStatus.ts'
import './index.css'

// Add dark class for Tailwind dark mode
document.documentElement.classList.add('dark')

// Cloud sync is optional and loaded lazily so Firebase stays out of the main bundle.
if (isFirebaseConfigured) {
  void import('./lib/sync').then((m) => m.initSync())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
