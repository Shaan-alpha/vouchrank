import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PublicFunnel from './components/PublicFunnel.jsx'

// Lightweight, dependency-free routing: /r/:id and /rate/:id render the public
// review funnel (the link sent in review requests); everything else is the app.
const funnelMatch = window.location.pathname.match(/^\/(?:r|rate)\/(.+?)\/?$/)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {funnelMatch ? <PublicFunnel locationId={decodeURIComponent(funnelMatch[1])} /> : <App />}
  </StrictMode>,
)
