import { createSuccessResponse, validateSession } from '@/lib/auth-api-utils'

export async function GET() {
  const { session, error } = await validateSession(true)

  if (error) {
    return error
  }

  return createSuccessResponse({
    authenticated: true,
    user: session?.user || null,
    session: session,
  })
}