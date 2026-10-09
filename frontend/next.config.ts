import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'

/** Paths the BFF owns. In production nginx routes them to the BFF before they reach Next.js. */
const BFF_PATHS = ['/api/:path*', '/oauth2/:path*', '/login/oauth2/:path*', '/auth/:path*']

const nextConfig: NextConfig = {
  // Self-contained server (`node server.js`) for a small, non-root Docker image.
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  async headers() {
    // The Content-Security-Policy is per request (nonce), so it is set in src/proxy.ts.
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ]
  },
  // Dev only: `next dev` on :5173 forwards BFF paths to the running stack (nginx :8080), like production's nginx.
  async rewrites() {
    return isDev ? BFF_PATHS.map((source) => ({ source, destination: `http://localhost:8080${source}` })) : []
  },
}

export default nextConfig
