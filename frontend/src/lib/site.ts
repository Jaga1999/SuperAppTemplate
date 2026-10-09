/** Product identity used by metadata, the web manifest, structured data and the Open Graph image. */
export const site = {
  name: 'SuperApp',
  description:
    'SuperApp: secure accounts from day one. Passkeys, two-step verification and instant sign-out on every device.',
  /** Public origin (nginx). Read at runtime on the server, so one image serves every environment. */
  url: process.env.PUBLIC_URL ?? 'http://localhost:8080',
  themeColor: { light: '#ffffff', dark: '#09090b' },
} as const
