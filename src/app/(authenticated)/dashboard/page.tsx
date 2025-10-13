'use client'

import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import ChatInterface from '@/components/ChatInterface'
import { useSession } from '@/hooks/useSession'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useSession({
    onUnauthenticated: () => router.push('/auth/login')
  })


  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="bg-gray-50 h-full overflow-hidden">
      <ChatInterface userId={user?.id || ''} />
    </div>
  )
}