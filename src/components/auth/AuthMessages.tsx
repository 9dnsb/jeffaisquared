interface AuthMessagesProps {
  error?: string
  message?: string
}

export function AuthMessages({ error, message }: AuthMessagesProps) {
  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
          {message}
        </div>
      )}
    </>
  )
}