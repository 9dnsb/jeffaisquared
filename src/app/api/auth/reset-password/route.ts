import { NextRequest } from 'next/server'
import { z } from 'zod'
import supabase from '../../../../../lib/supabase'
import { parseRequestBody, handleSupabaseError, createSuccessResponse, validateSession } from '@/lib/auth-api-utils'

const ResetPasswordSchema = z.object({
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, ResetPasswordSchema)

  if (parseError) {
    return parseError
  }

  const { error } = await supabase.auth.updateUser({
    password: validatedData.password
  })

  if (error) {
    return handleSupabaseError(error)
  }

  return createSuccessResponse({
    message: 'Password updated successfully!',
  })
}

export async function GET() {
  const { session, error } = await validateSession()

  if (error) {
    return error
  }

  return createSuccessResponse({
    isValid: true,
    session: session,
  })
}