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
            className="text-sm font-heading text-secondary hover:text-secondary/80"
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
          className="font-heading font-medium text-secondary hover:text-secondary/80"
        >
          {linkText}
        </Link>
      </div>
    </>
  )
}