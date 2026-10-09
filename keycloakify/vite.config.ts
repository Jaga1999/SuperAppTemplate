import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { keycloakify } from 'keycloakify/vite-plugin'
import { defineConfig } from 'vite'

// Keycloak login theme (Keycloakify). Standalone project with the same design tokens as ../frontend, separate release unit:
//  - `pnpm dev`                   -> preview pages with mock data: http://localhost:5174/?kc=login.ftl
//  - `pnpm build-keycloak-theme`  -> dist_keycloak/superapp-keycloak-theme.jar (baked into the Keycloak image)
// https://docs.keycloakify.dev
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    keycloakify({
      themeName: 'superapp',
      accountThemeImplementation: 'none',
      keycloakVersionTargets: {
        '22-to-25': false,
        'all-other-versions': 'superapp-keycloak-theme.jar',
      },
      // Exposed to the theme as kcContext.properties.* (set on the Keycloak container).
      environmentVariables: [{ name: 'SUPERAPP_GOOGLE_LOGIN_ENABLED', default: 'false' }],
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5174, strictPort: true },
})
