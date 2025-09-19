'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthForm } from '@/hooks/useAuthForm'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthMessages } from '@/components/auth/AuthMessages'
import { AuthInput } from '@/components/auth/AuthInput'
import { AuthButton } from '@/components/auth/AuthButton'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')

  const { loading, error, message, submitForm } = useAuthForm({
    endpoint: '/api/auth/forgot-password',
  })

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm({
      email,
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
  }

  return (
    <AuthLayout title="Reset your password">
      <div>
        <p className="mt-2 text-center text-sm text-text-gray">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleForgotPassword}>
        <AuthMessages error={error} message={message} />

        <div>
          <AuthInput
            id="email"
            name="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <AuthButton loading={loading} loadingText="Sending...">
            Send reset link
          </AuthButton>
        </div>

        <div className="text-center">
          <Link
            href="/auth/login"
            className="font-heading font-medium text-secondary hover:text-secondary/80"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthLayout>
  )
}