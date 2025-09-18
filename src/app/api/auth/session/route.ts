import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '../../../../../lib/supabase-server'

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    console.log('Session validation:', {
      hasUser: !!user,
      error: error?.message,
      supabaseUrl: process.env['NEXT_PUBLIC_SUPABASE_URL'],
    })

    if (error || !user) {
      return NextResponse.json(
        { authenticated: false, error: error?.message || 'No active session' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: user,
      session: { user: { id: user.id } },
    })
  } catch (err) {
    console.error('Session check error:', err)
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 401 }
    )
  }
}