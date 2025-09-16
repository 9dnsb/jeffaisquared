'use client'

import { useState } from 'react'
import { useAuthForm } from '@/hooks/useAuthForm'
import { useAuthRedirect } from '@/hooks/useAuthRedirect'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { AuthMessages } from '@/components/auth/AuthMessages'
import { AuthInput } from '@/components/auth/AuthInput'
import { AuthEmailPasswordInputs } from '@/components/auth/AuthEmailPasswordInputs'
import { AuthFormFooter } from '@/components/auth/AuthFormFooter'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')

  const isCheckingSession = useAuthRedirect()
  const { loading, error, message, submitForm } = useAuthForm({
    endpoint: '/api/auth/register',
  })

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    await submitForm({ email, password, firstName, lastName })
  }

  // Show loading spinner while checking existing session
  if (isCheckingSession) {
    return <LoadingSpinner />
  }

  return (
    <AuthLayout title="Create your account">
      <form className="mt-8 space-y-6" onSubmit={handleRegister}>
        <AuthMessages error={error} message={message} />

        <div className="space-y-4">
          <div className="flex space-x-4">
            <AuthInput
              id="firstName"
              name="firstName"
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <AuthInput
              id="lastName"
              name="lastName"
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <AuthEmailPasswordInputs
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            passwordPlaceholder="Password (min 6 characters)"
            autoComplete="new-password"
            minLength={6}
          />
        </div>

        <AuthFormFooter
          loading={loading}
          loadingText="Creating account..."
          buttonText="Create account"
          linkHref="/auth/login"
          linkText="Already have an account? Sign in"
        />
      </form>
    </AuthLayout>
  )
}