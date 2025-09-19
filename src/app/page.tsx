'use client'

import Link from 'next/link'
import { useAuthRedirect } from '../hooks/useAuthRedirect'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import Navbar from '../components/navbar/Navbar'

export default function Home() {
  const isCheckingSession = useAuthRedirect()

  if (isCheckingSession) {
    return <LoadingSpinner />
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-4xl font-display text-primary">
            Sales Analytics Platform
          </h1>
          <p className="mt-2 text-center text-base font-sans text-text-gray">
            AI-powered sales data analytics
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <Link
              href="/auth/login"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-heading font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
            >
              Sign In
            </Link>
          </div>
          <div className="text-center">
            <Link
              href="/auth/register"
              className="font-heading font-medium text-secondary hover:text-secondary/80"
            >
              Don&apos;t have an account? Sign up
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
