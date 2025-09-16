'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthForm } from '@/hooks/useAuthForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthMessages } from '@/components/auth/AuthMessages'
import { AuthInput } from '@/components/auth/AuthInput'
import { AuthButton } from '@/components/auth/AuthButton'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isValidSession, setIsValidSession] = useState(false)
  const router = useRouter()

  const { loading, error, message, submitForm, setError } = useAuthForm({
    endpoint: '/api/auth/reset-password',
    onSuccess: (data) => {
      const successData = data as { message?: string }
      if (successData.message) {
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      }
    },
  })

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/reset-password')
        const data = await response.json() as { isValid: boolean; error?: string }

        if (response.ok && data.isValid) {
          setIsValidSession(true)
        } else {
          const hashParams = new URLSearchParams(window.location.hash.substr(1))
          if (hashParams.get('access_token')) {
            setIsValidSession(true)
          } else {
            setError('Invalid reset link. Please request a new password reset.')
          }
        }
      } catch {
        setError('Invalid reset link. Please request a new password reset.')
      }
    }

    checkSession()
  }, [setError])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    await submitForm({ password })
  }

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error && !isValidSession) {
    return (
      <AuthLayout title="Invalid Reset Link">
        <div className="text-center">
          <p className="mt-2 text-sm text-gray-600">
            This password reset link is invalid or has expired.
          </p>
          <div className="mt-4">
            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Request a new password reset
            </button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Set new password">
      <div>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
        <AuthMessages error={error} message={message} />

        <div className="space-y-4">
          <div>
            <AuthInput
              id="password"
              name="password"
              type="password"
              placeholder="New password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
          <div>
            <AuthInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
            />
          </div>
        </div>

        <div>
          <AuthButton loading={loading} loadingText="Updating password...">
            Update password
          </AuthButton>
        </div>
      </form>
    </AuthLayout>
  )
}