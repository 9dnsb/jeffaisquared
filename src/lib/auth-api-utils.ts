import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '../../lib/supabase-server'

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
 * Handle Supabase auth errors consistently
 */
export function handleSupabaseError(error: { message: string }): NextResponse {
  return createErrorResponse(error.message, HTTP_BAD_REQUEST)
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
 * Validate session and return appropriate response
 * Note: This is deprecated - use the new pattern with NextRequest/NextResponse
 */
export async function validateSession(requireUser = false): Promise<{
  session: { user: { id: string } } | null;
  error?: NextResponse;
}> {
  // This is a fallback for routes that haven't been updated yet
  console.warn('validateSession is deprecated, update to use createSupabaseServerClient with request/response')

  try {
    // Try to get user without proper cookie handling (will likely fail)
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // Debug logging to understand the authentication state
    console.log('Session validation (deprecated):', {
      hasUser: !!user,
      error: error?.message,
      supabaseUrl: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    })

    if (error) {
      console.error('Supabase auth error:', error)
      return { session: null, error: createErrorResponse(error.message, HTTP_UNAUTHORIZED) }
    }

    if (!user || (requireUser && !user)) {
      return { session: null, error: createErrorResponse(NO_ACTIVE_SESSION_MESSAGE, HTTP_UNAUTHORIZED) }
    }

    // Return user in session format for compatibility
    return { session: { user: { id: user.id } } }
  } catch (err) {
    console.error('Session validation error:', err)
    return { session: null, error: createErrorResponse('Auth session missing!', HTTP_UNAUTHORIZED) }
  }
}