import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { Toaster } from '@superapp/ui/components/sonner'
import { TooltipProvider } from '@superapp/ui/components/tooltip'
import { ApiError } from './lib/api'
import { AppShell } from './layout/app-shell'
import { RequireAuth, RequireRole } from './layout/guards'
import { NotFoundPage } from './pages/not-found'
import { RouteError } from './pages/route-error'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failures, error) => !(error instanceof ApiError && error.status < 500) && failures < 2,
      refetchOnWindowFocus: true,
    },
  },
})

const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: async () => ({ Component: (await import('./pages/landing')).LandingPage }) },
      // Public: linked from the sign-up/consent pages and must be readable without an account.
      { path: 'legal/terms', lazy: async () => ({ Component: (await import('./pages/legal')).TermsPage }) },
      { path: 'legal/privacy', lazy: async () => ({ Component: (await import('./pages/legal')).PrivacyPage }) },
      {
        path: 'app',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, lazy: async () => ({ Component: (await import('./pages/todos')).TodosPage }) },
          { path: 'activity', lazy: async () => ({ Component: (await import('./pages/activity')).ActivityPage }) },
          {
            path: 'settings',
            lazy: async () => ({ Component: (await import('./pages/settings/settings-layout')).SettingsLayout }),
            children: [
              { index: true, lazy: async () => ({ Component: (await import('./pages/settings/profile')).ProfileSettings }) },
              { path: 'security', lazy: async () => ({ Component: (await import('./pages/settings/security')).SecuritySettings }) },
              { path: 'sessions', lazy: async () => ({ Component: (await import('./pages/settings/sessions')).SessionsSettings }) },
            ],
          },
          {
            path: 'admin',
            element: <RequireRole role="admin" />,
            children: [{ index: true, lazy: async () => ({ Component: (await import('./pages/admin')).AdminPage }) }],
          },
        ],
      },
      { path: '*', Component: NotFoundPage },
    ],
  },
])

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={300}>
          <RouterProvider router={router} />
          <Toaster richColors closeButton position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
