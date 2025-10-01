'use client'

import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'

interface UseSessionOptions {
  redirectToLogin?: boolean
  onUnauthenticated?: () => void
}

export function useSession(options: UseSessionOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Store callback in ref to avoid re-running effect when it changes
  const onUnauthenticatedRef = useRef(options.onUnauthenticated)

  // Update ref in effect, not during render (per React docs)
  useEffect(() => {
    onUnauthenticatedRef.current = options.onUnauthenticated
  })

  useEffect(() => {
    const getUser = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'include',
        })
        const data = (await response.json()) as {
          authenticated: boolean
          user?: User
          error?: string
        }

        if (response.ok && data.authenticated && data.user) {
          setUser(data.user)
        } else {
          setUser(null)
          if (onUnauthenticatedRef.current) {
            onUnauthenticatedRef.current()
          }
        }
      } catch {
        setUser(null)
        if (onUnauthenticatedRef.current) {
          onUnauthenticatedRef.current()
        }
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, []) // Empty deps - only fetch session once on mount

  return { user, loading, setUser }
}
