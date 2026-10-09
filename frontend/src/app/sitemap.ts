import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { site } from '@/lib/site'

/** Rendered per request: the public URL comes from the runtime environment, not the build machine. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  return [
    { url: site.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/legal/terms`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${site.url}/legal/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
