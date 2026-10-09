import { ImageResponse } from 'next/og'
import { site } from '@/lib/site'

/** Social preview card (Open Graph + Twitter), generated once at build time. */
export const alt = `${site.name}: secure accounts from day one`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 80,
        color: 'white',
        backgroundImage: 'radial-gradient(120% 120% at 0% 0%, #7c5cff 0%, #4f46e5 45%, #1e1b4b 100%)',
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 600, opacity: 0.85 }}>{site.name}</div>
      <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, marginTop: 24, maxWidth: 900 }}>
        Build your product, not your sign-in.
      </div>
      <div style={{ fontSize: 32, marginTop: 32, opacity: 0.8 }}>Passkeys · Two-step verification · Sign out everywhere</div>
    </div>,
    size,
  )
}
