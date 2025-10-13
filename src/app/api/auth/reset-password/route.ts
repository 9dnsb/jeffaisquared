import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '../../../../../lib/supabase-server'
import { parseRequestBody, handleSupabaseError, createSuccessResponse, authenticateUser } from '@/lib/auth-api-utils'

const MIN_PASSWORD_LENGTH = 6
const PASSWORD_UPDATED_MESSAGE = 'Password updated successfully!'

const ResetPasswordSchema = z.object({
  password: z.string().min(MIN_PASSWORD_LENGTH),
})

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, ResetPasswordSchema)

  if (parseError) {
    return parseError
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    password: validatedData.password
  })

  if (error) {
    return handleSupabaseError(error)
  }

  return createSuccessResponse({
    message: PASSWORD_UPDATED_MESSAGE,
  })
}

export async function GET() {
  const authResult = await authenticateUser()
  if (authResult.error) return authResult.error

  return createSuccessResponse({
    isValid: true,
    session: { user: { id: authResult.userId } },
  })
}