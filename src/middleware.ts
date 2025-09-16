import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOGIN_PATH = '/auth/login'
const DASHBOARD_PATH = '/dashboard'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Check for any Supabase auth cookies (both dev and prod project IDs)
  const hasSupabaseAuth = Array.from(request.cookies.getAll()).some(cookie =>
    cookie.name.includes('sb-') && cookie.name.includes('-auth-token')
  )

  // If user is not signed in and the current path is a protected route, redirect to login
  if (!hasSupabaseAuth && request.nextUrl.pathname.startsWith(DASHBOARD_PATH)) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  if (!hasSupabaseAuth && request.nextUrl.pathname.startsWith('/chat')) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
  }

  // If user is signed in and the current path is an auth page, redirect to dashboard
  if (hasSupabaseAuth && request.nextUrl.pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/chat/:path*', '/auth/:path*']
}