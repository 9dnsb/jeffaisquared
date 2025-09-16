import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Hook to check for existing authentication session and redirect if authenticated
 * Used on auth pages (login/register) to prevent authenticated users from accessing them
 */
export function useAuthRedirect() {
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json() as { authenticated: boolean }

        if (response.ok && data.authenticated) {
          router.push('/dashboard')
          return
        }
      } catch {
        // Continue to auth form if session check fails
      } finally {
        setIsCheckingSession(false)
      }
    }

    checkSession()
  }, [router])

  return isCheckingSession
}