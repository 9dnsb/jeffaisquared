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
export function createSuccessResponse(data: Record<string, string | boolean | number | null | object>, status = 200) {
  return NextResponse.json(data, { status })
}

/**
 * Centralized error handling for auth API routes
 */
export function handleAuthApiError(err: Error | z.ZodError | object): NextResponse {
  if (err instanceof z.ZodError) {
    return createErrorResponse('Invalid input', 400)
  }

  return createErrorResponse('Internal server error', 500)
}

/**
 * Handle Supabase auth errors consistently
 */
export function handleSupabaseError(error: { message: string }): NextResponse {
  return createErrorResponse(error.message, 400)
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
 */
export async function validateSession(requireUser = false): Promise<{
  session: { user: { id: string } } | null;
  error?: NextResponse;
}> {
  const supabase = await createSupabaseServerClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  // Debug logging to understand the cookie mismatch
  console.log('Session validation:', {
    hasSession: !!session,
    hasUser: !!session?.user,
    error: error?.message,
    supabaseUrl: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  })

  if (error) {
    console.error('Supabase session error:', error)
    return { session: null, error: createErrorResponse(error.message, 401) }
  }

  if (!session || (requireUser && !session.user)) {
    return { session: null, error: createErrorResponse('No active session', 401) }
  }

  return { session }
}