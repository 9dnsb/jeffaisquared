'use client'

import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import ChatInterface from '@/components/ChatInterface'
import Navbar from '@/components/navbar/Navbar'
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 overflow-hidden">
        <div className="h-full">
          <ChatInterface userId={user?.id || ''} />
        </div>
      </main>
    </div>
  )
}