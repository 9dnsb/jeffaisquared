interface AuthButtonProps {
  loading: boolean
  loadingText: string
  children: React.ReactNode
  disabled?: boolean
}

export function AuthButton({ loading, loadingText, children, disabled }: AuthButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-heading font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
    >
      {loading ? loadingText : children}
    </button>
  )
}