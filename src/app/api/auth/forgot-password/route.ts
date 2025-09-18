import { NextRequest } from 'next/server'
import { z } from 'zod'
import supabase from '../../../../../lib/supabase'
import { parseRequestBody, handleSupabaseError, createSuccessResponse } from '@/lib/auth-api-utils'

const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  redirectTo: z.string().url(),
})

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, ForgotPasswordSchema)

  if (parseError) {
    return parseError
  }

  const { error } = await supabase.auth.resetPasswordForEmail(
    validatedData.email,
    {
      redirectTo: validatedData.redirectTo,
    }
  )

  if (error) {
    return handleSupabaseError(error)
  }

  return createSuccessResponse({
    message: 'Check your email for the password reset link!',
  })
}
