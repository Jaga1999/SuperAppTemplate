import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { KcPage } from './kc.gen'

/**
 * Inside Keycloak, `window.kcContext` is injected by the FreeMarker template -> render that page.
 * In dev there is no Keycloak: `?kc=<page>.ftl` (default login.ftl) renders the page with mock data.
 */
async function boot() {
  if (import.meta.env.DEV && !window.kcContext) {
    const page = new URLSearchParams(window.location.search).get('kc') ?? 'login.ftl'
    const { mockFor } = await import('./login/KcPageMock')
    window.kcContext = mockFor(page)
  }
  if (!window.kcContext) {
    return // production bundle opened outside Keycloak: nothing to render
  }
  createRoot(document.getElementById('root') as HTMLElement).render(
    <StrictMode>
      <KcPage kcContext={window.kcContext} />
    </StrictMode>,
  )
}

void boot()
