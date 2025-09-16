import { NextRequest } from 'next/server'
import { z } from 'zod'
import supabase from '@/root-lib/supabase'
import { parseRequestBody, handleSupabaseError, createSuccessResponse } from '@/lib/auth-api-utils'

const RegisterSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, RegisterSchema)

  if (parseError) {
    return parseError
  }

  const { data, error } = await supabase.auth.signUp({
    email: validatedData.email,
    password: validatedData.password,
    options: {
      data: {
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
      }
    }
  })

  if (error) {
    return handleSupabaseError(error)
  }

  return createSuccessResponse({
    user: data.user,
    session: data.session,
    message: 'Check your email for the confirmation link!',
  })
}