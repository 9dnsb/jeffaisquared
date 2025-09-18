import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AuthFormData {
  user?: { id: string }
  message?: string
  [key: string]: string | { id: string } | undefined
}

interface UseAuthFormOptions {
  endpoint: string
  redirectTo?: string
  onSuccess?: (data: AuthFormData) => void
}

export function useAuthForm({ endpoint, redirectTo, onSuccess }: UseAuthFormOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const submitForm = async (formData: Record<string, string>) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json() as AuthFormData

      if (!response.ok) {
        const errorData = data as { error?: string }
        throw new Error(errorData.error || 'Request failed')
      }

      const successData = data as { user?: { id: string }; message?: string }

      if (successData.message) {
        setMessage(successData.message)
      }

      if (onSuccess) {
        onSuccess(data)
      } else if (successData.user && redirectTo) {
        router.push(redirectTo)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    message,
    submitForm,
    setError,
    setMessage,
  }
}