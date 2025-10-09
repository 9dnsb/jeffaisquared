import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '../../lib/supabase-server'
import { parseRequestBody, handleSupabaseError, createSuccessResponse, createErrorResponse } from './auth-api-utils'
import { ensureUserProfile } from './profile-utils'
import { PrismaClient } from '../generated/prisma'

const MIN_PASSWORD_LENGTH = 6
const MIN_NAME_LENGTH = 1
const HTTP_INTERNAL_SERVER_ERROR = 500
const USER_CREATION_FAILED_MESSAGE = 'User creation failed'
const REGISTRATION_FAILED_MESSAGE = 'Registration failed'
const EMAIL_CONFIRMATION_MESSAGE = 'Check your email for the confirmation link!'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
  firstName: z.string().min(MIN_NAME_LENGTH),
  lastName: z.string().min(MIN_NAME_LENGTH),
})

export async function handleRegistration(request: NextRequest, prismaClient: PrismaClient) {
  try {
    const { data: validatedData, error: parseError } = await parseRequestBody(request, RegisterSchema)

    if (parseError) {
      return parseError
    }
    // Step 1: Create user in Supabase Auth
    const supabase = await createSupabaseServerClient()
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
      console.error('Supabase signup error:', error)
      return handleSupabaseError(error)
    }

    if (!data.user) {
      return createErrorResponse(USER_CREATION_FAILED_MESSAGE, HTTP_INTERNAL_SERVER_ERROR)
    }

    // Step 2: Ensure profile is created (fallback if trigger fails)
    await ensureUserProfile(data.user.id, validatedData.email, validatedData.firstName, validatedData.lastName, prismaClient)

    // In production, email confirmation is required, so show confirmation message
    // In development, user is immediately confirmed, so no message needed
    const isProduction = process.env['NODE_ENV'] === 'production'
    const needsEmailConfirmation = !data.session && isProduction

    const responseData: Record<string, string | boolean | number | null | object> = {
      user: data.user,
      session: data.session,
    }

    if (needsEmailConfirmation) {
      responseData['message'] = EMAIL_CONFIRMATION_MESSAGE
    }

    return createSuccessResponse(responseData)

  } catch (err) {
    console.error('Registration error:', err)
    return createErrorResponse(REGISTRATION_FAILED_MESSAGE, HTTP_INTERNAL_SERVER_ERROR)
  /* c8 ignore next */ } finally {
    await prismaClient.$disconnect()
  }
}