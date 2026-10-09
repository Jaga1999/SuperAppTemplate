import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The SuperApp SPA (served by nginx). The Keycloak login theme is a separate project: ../keycloakify.
const LEGAL_DIR = path.resolve(import.meta.dirname, '../legal')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // legal/*.md at the repo root is the single source for the documents (Keycloak reads their versions too).
    alias: { '@': path.resolve(import.meta.dirname, 'src'), '@legal': LEGAL_DIR },
  },
  server: {
    port: 5173,
    fs: { allow: [import.meta.dirname, LEGAL_DIR] },
    strictPort: true,
    // Dev: everything server-side goes to the edge (nginx :8080 -> BFF -> Keycloak), exactly like production.
    proxy: Object.fromEntries(
      ['/api', '/oauth2', '/login/oauth2', '/auth'].map((p) => [
        p,
        { target: 'http://localhost:8080', changeOrigin: false, xfwd: true },
      ]),
    ),
  },
})
