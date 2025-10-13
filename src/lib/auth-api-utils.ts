import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '../../lib/supabase-server'
import prisma from '@/root-lib/prisma'

/**
 * Standard error response utility for auth API routes
 */
export function createErrorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Standard success response utility for auth API routes
 */
const HTTP_OK = 200

export function createSuccessResponse(data: Record<string, string | boolean | number | null | object>, status = HTTP_OK) {
  return NextResponse.json(data, { status })
}

/**
 * Centralized error handling for auth API routes
 */
const HTTP_BAD_REQUEST = 400
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_UNAUTHORIZED = 401
const INVALID_INPUT_MESSAGE = 'Invalid input'
const INTERNAL_SERVER_ERROR_MESSAGE = 'Internal server error'
const NO_ACTIVE_SESSION_MESSAGE = 'No active session'

export function handleAuthApiError(err: Error | z.ZodError | object): NextResponse {
  if (err instanceof z.ZodError) {
    return createErrorResponse(INVALID_INPUT_MESSAGE, HTTP_BAD_REQUEST)
  }

  return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE, HTTP_INTERNAL_SERVER_ERROR)
}

/**
 * Authenticate user and return user ID or error response.
 *
 * This is the modern authentication pattern for Next.js 15 App Router with Supabase SSR.
 * Use this in all Route Handlers to eliminate duplicate authentication code.
 *
 * @returns Object with either userId or error NextResponse
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = await authenticateUser()
 *   if (authResult.error) return authResult.error
 *
 *   const userId = authResult.userId
 *   // ... rest of handler
 * }
 * ```
 */
export async function authenticateUser(): Promise<
  | { userId: string; error?: never }
  | { userId?: never; error: NextResponse }
> {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: HTTP_UNAUTHORIZED }
      )
    }
  }

  return { userId: user.id }
}

/**
 * Handle Supabase auth errors consistently
 */
export function handleSupabaseError(error: { message: string }): NextResponse {
  return createErrorResponse(error.message, HTTP_BAD_REQUEST)
}

/**
 * Handle route errors with consistent logging and response format.
 * Eliminates duplicate error handling blocks across routes.
 *
 * @param err Error object
 * @param context Logging context (e.g., '[DELETE /api/alerts]')
 * @returns NextResponse with error message and 500 status
 *
 * @example
 * ```typescript
 * } catch (err) {
 *   return handleRouteError(err, '[DELETE /api/alerts]')
 * }
 * ```
 */
export function handleRouteError(err: unknown, context: string): NextResponse {
  const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
  console.error(`${context} Error:`, errorMessage)
  return NextResponse.json({ error: errorMessage }, { status: HTTP_INTERNAL_SERVER_ERROR })
}

/**
 * Parse and validate request body with consistent error handling
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: NextResponse }> {
  try {
    const body = await request.json() as Record<string, string | number | boolean>
    const validatedData = schema.parse(body)
    return { data: validatedData }
  } catch (err) {
    return {
      data: {} as T,
      error: handleAuthApiError(err as Error | z.ZodError)
    }
  }
}

/**
 * @deprecated ONLY use in test files. Production code should use createSupabaseServerClient() directly.
 *
 * Validate session and return appropriate response.
 * This function is kept only for backward compatibility with existing test files.
 *
 * For production routes, use this pattern instead:
 * ```typescript
 * const supabase = await createSupabaseServerClient()
 * const { data: { user }, error } = await supabase.auth.getUser()
 * if (error || !user) {
 *   return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
 * }
 * const userId = user.id
 * ```
 */
export async function validateSession(requireUser = false): Promise<{
  session: { user: { id: string } } | null;
  error?: NextResponse;
}> {
  console.warn('⚠️ validateSession is DEPRECATED. Only use in test files. Update production code to use createSupabaseServerClient() directly.')

  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) {
      console.error('Supabase auth error:', error)
      return { session: null, error: createErrorResponse(error.message, HTTP_UNAUTHORIZED) }
    }

    if (!user || (requireUser && !user)) {
      return { session: null, error: createErrorResponse(NO_ACTIVE_SESSION_MESSAGE, HTTP_UNAUTHORIZED) }
    }

    return { session: { user: { id: user.id } } }
  } catch (err) {
    console.error('Session validation error:', err)
    return { session: null, error: createErrorResponse('Auth session missing!', HTTP_UNAUTHORIZED) }
  }
}

/**
 * Verify resource ownership by checking if a resource belongs to the authenticated user
 * @param resourceType The type of resource (e.g., 'alert', 'notification')
 * @param resourceId The ID of the resource
 * @param userId The authenticated user's ID
 * @returns NextResponse with error if verification fails, null if successful
 */
export async function verifyResourceOwnership(
  resourceType: 'alert' | 'notification',
  resourceId: string,
  userId: string
): Promise<NextResponse | null> {
  try {
    let resource: { userId: string } | null = null

    if (resourceType === 'alert') {
      resource = await prisma.alertRule.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      })
    } else if (resourceType === 'notification') {
      resource = await prisma.notification.findUnique({
        where: { id: resourceId },
        select: { userId: true },
      })
    }

    if (!resource) {
      return createErrorResponse(
        `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found`,
        404
      )
    }

    if (resource.userId !== userId) {
      return createErrorResponse(
        `Unauthorized to access this ${resourceType}`,
        403
      )
    }

    return null
  } catch (err) {
    console.error(`Error verifying ${resourceType} ownership:`, err)
    return createErrorResponse(INTERNAL_SERVER_ERROR_MESSAGE, HTTP_INTERNAL_SERVER_ERROR)
  }
}

/**
 * Authenticate user and verify resource ownership in one step.
 * Eliminates duplicate auth + ownership verification pattern in PATCH/DELETE handlers.
 *
 * @param request NextRequest object
 * @param resourceType Type of resource ('alert' or 'notification')
 * @param resourceName Human-readable resource name for error messages
 * @returns Object with resourceId and userId, or error response
 *
 * @example
 * ```typescript
 * export async function PATCH(request: NextRequest) {
 *   const result = await authenticateAndVerifyResource(request, 'alert', 'Alert')
 *   if (result.error) return result.error
 *
 *   const { resourceId, userId } = result
 *   // ... proceed with update
 * }
 * ```
 */
export async function authenticateAndVerifyResource(
  request: { nextUrl: { searchParams: URLSearchParams } },
  resourceType: 'alert' | 'notification',
  resourceName: string
): Promise<
  | { resourceId: string; userId: string; error?: never }
  | { resourceId?: never; userId?: never; error: NextResponse }
> {
  // Authenticate user
  const authResult = await authenticateUser()
  if (authResult.error) return { error: authResult.error }

  const userId = authResult.userId
  const id = request.nextUrl.searchParams.get('id')

  if (!id) {
    return {
      error: NextResponse.json(
        { error: `${resourceName} ID is required` },
        { status: 400 }
      )
    }
  }

  // Verify resource ownership
  const ownershipError = await verifyResourceOwnership(resourceType, id, userId)
  if (ownershipError) {
    return { error: ownershipError }
  }

  return { resourceId: id, userId }
}