import type { Metadata } from 'next'
import { NotFoundPage } from '@/views/not-found'

export const metadata: Metadata = { title: 'Page not found', robots: { index: false } }

export default function NotFound() {
  return <NotFoundPage />
}
