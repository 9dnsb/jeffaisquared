import Link from 'next/link'
import { AuthButton } from './AuthButton'

interface AuthFormFooterProps {
  loading: boolean
  loadingText: string
  buttonText: string
  linkHref: string
  linkText: string
  showForgotPassword?: boolean
}

export function AuthFormFooter({
  loading,
  loadingText,
  buttonText,
  linkHref,
  linkText,
  showForgotPassword = false,
}: AuthFormFooterProps) {
  return (
    <>
      {showForgotPassword && (
        <div className="flex items-center justify-between">
          <Link
            href="/auth/forgot-password"
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            Forgot your password?
          </Link>
        </div>
      )}

      <div>
        <AuthButton loading={loading} loadingText={loadingText}>
          {buttonText}
        </AuthButton>
      </div>

      <div className="text-center">
        <Link
          href={linkHref}
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          {linkText}
        </Link>
      </div>
    </>
  )
}