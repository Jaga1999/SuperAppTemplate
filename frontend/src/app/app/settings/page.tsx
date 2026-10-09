import type { Metadata } from 'next'
import { ProfileSettings } from '@/views/settings/profile'

export const metadata: Metadata = { title: 'Profile' }

export default function Page() {
  return <ProfileSettings />
}
