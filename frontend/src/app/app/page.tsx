import type { Metadata } from 'next'
import { HomePage } from '@/views/home'

export const metadata: Metadata = { title: 'Home' }

export default function Page() {
  return <HomePage />
}
