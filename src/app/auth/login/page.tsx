'use client'

import { useState } from 'react'
import { useAuthForm } from '@/hooks/useAuthForm'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthMessages } from '@/components/auth/AuthMessages'
import { AuthEmailPasswordInputs } from '@/components/auth/AuthEmailPasswordInputs'
import { AuthFormFooter } from '@/components/auth/AuthFormFooter'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const isCheckingSession = useAuthRedirect()
  const { loading, error, submitForm } = useAuthForm({
    endpoint: '/api/auth/login',
    redirectTo: '/dashboard',
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm({ email, password })
  }

  // Show loading spinner while checking existing session
  if (isCheckingSession) {
    return <LoadingSpinner />
  }

  return (
    <AuthLayout title="Sign in to your account">
      <form className="mt-8 space-y-6" onSubmit={handleLogin}>
        <AuthMessages error={error} />

        <AuthEmailPasswordInputs
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          stacked={true}
          autoComplete="current-password"
        />

        <AuthFormFooter
          loading={loading}
          loadingText="Signing in..."
          buttonText="Sign in"
          linkHref="/auth/register"
          linkText="Don&apos;t have an account? Sign up"
          showForgotPassword={true}
        />
      </form>
    </AuthLayout>
  )
}