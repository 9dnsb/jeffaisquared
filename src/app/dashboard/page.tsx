'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import ChatInterface from '@/components/ChatInterface'
import Navbar from '@/components/navbar/Navbar'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include'
        })
        const data = await response.json() as { authenticated: boolean; user?: User; error?: string }

        if (!response.ok || !data.authenticated) {
          router.push('/auth/login')
          return
        }

        if (data.user) {
          setUser(data.user)
        }
      } catch {
        router.push('/auth/login')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [router])


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