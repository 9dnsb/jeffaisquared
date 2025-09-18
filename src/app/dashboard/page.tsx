'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import ChatInterface from '@/components/ChatInterface'

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

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        router.push('/')
      }
    } catch {
      // Handle error silently or show notification
      router.push('/')
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Sales Analytics Platform</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        <div className="h-full">
          <ChatInterface userId={user?.id || ''} />
        </div>
      </main>
    </div>
  )
}