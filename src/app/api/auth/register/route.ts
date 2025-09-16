import { NextRequest } from 'next/server'
import { z } from 'zod'
import supabase from '../../../../../lib/supabase'
import { parseRequestBody, handleSupabaseError, createSuccessResponse, createErrorResponse } from '@/lib/auth-api-utils'
import { PrismaClient } from '../../../../generated/prisma'

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
})

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, RegisterSchema)

  if (parseError) {
    return parseError
  }

  try {
    // Step 1: Create user in Supabase Auth
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
      return createErrorResponse('User creation failed', 500)
    }

    // Step 2: Ensure profile is created (fallback if trigger fails)
    try {
      // Wait a moment for trigger to potentially run
      await new Promise(resolve => setTimeout(resolve, 100))

      // Check if profile already exists (created by trigger)
      const existingProfile = await prisma.profile.findUnique({
        where: { id: data.user.id }
      })

      if (!existingProfile) {
        console.log('Trigger did not create profile, creating manually...')
        // Create profile manually as fallback
        await prisma.profile.create({
          data: {
            id: data.user.id,
            email: validatedData.email,
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
          }
        })
        console.log('Profile created manually for user:', data.user.id)
      } else {
        console.log('Profile already exists (created by trigger):', existingProfile.id)
      }
    } catch (profileError) {
      console.error('Error creating profile:', profileError)
      // Don't fail the registration if profile creation fails
      // The user is still created in Supabase Auth
    }

    return createSuccessResponse({
      user: data.user,
      session: data.session,
      message: 'Check your email for the confirmation link!',
    })

  } catch (err) {
    console.error('Registration error:', err)
    return createErrorResponse('Registration failed', 500)
  } finally {
    await prisma.$disconnect()
  }
}