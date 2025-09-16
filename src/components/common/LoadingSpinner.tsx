interface LoadingSpinnerProps {
  className?: string
}

export function LoadingSpinner({ className = "h-32 w-32" }: LoadingSpinnerProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={`animate-spin rounded-full border-b-2 border-indigo-600 ${className}`}></div>
    </div>
  )
}