import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseServerClient } from '../../../../../lib/supabase-server'
import { parseRequestBody } from '@/lib/auth-api-utils'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const { data: validatedData, error: parseError } = await parseRequestBody(request, LoginSchema)

  if (parseError) {
    return parseError
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: validatedData.email,
    password: validatedData.password,
  })

  console.log('Login attempt:', {
    email: validatedData.email,
    success: !error,
    error: error?.message,
    hasUser: !!data.user,
    hasSession: !!data.session,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    user: data.user,
    session: data.session,
  })
}