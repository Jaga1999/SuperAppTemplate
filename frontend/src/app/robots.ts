import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { site } from '@/lib/site'

/**
 * Index the public pages only; the signed-in app, the BFF and the sign-in flow are never crawled.
 * Rendered per request: the public URL comes from the runtime environment, not the build machine.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection()
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/app', '/api/', '/auth/', '/oauth2/', '/login/'] },
    sitemap: `${site.url}/sitemap.xml`,
  }
}
