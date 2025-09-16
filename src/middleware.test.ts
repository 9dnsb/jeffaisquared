import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn(),
      next: vi.fn()
    }
  }
})

describe('middleware', () => {
  let NextResponse: any

  const PATHS = {
    DASHBOARD: '/dashboard',
    AUTH_LOGIN: '/auth/login'
  }

  const COOKIE_NAMES = {
    SB_TEST_AUTH_TOKEN: 'sb-test-auth-token'
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    NextResponse = (await import('next/server')).NextResponse
  })

  const createRequest = (pathname: string, cookies: Array<{ name: string; value: string }> = []) => {
    return {
      nextUrl: { pathname },
      cookies: {
        getAll: () => cookies
      },
      url: `http://localhost:3000${pathname}`
    } as NextRequest
  }

  describe('authenticated user', () => {
    const authCookies = [
      { name: COOKIE_NAMES.SB_TEST_AUTH_TOKEN, value: 'token123' }
    ]

    it('should redirect authenticated user from /auth to dashboard', async () => {
      const request = createRequest(PATHS.AUTH_LOGIN, authCookies)

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.DASHBOARD, request.url))
    })

    it('should redirect authenticated user from /auth/register to dashboard', async () => {
      const request = createRequest('/auth/register', authCookies)

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.DASHBOARD, request.url))
    })

    it('should allow authenticated user to access dashboard', async () => {
      const request = createRequest(PATHS.DASHBOARD, authCookies)

      await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should allow authenticated user to access chat', async () => {
      const request = createRequest('/chat', authCookies)

      await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('unauthenticated user', () => {
    it('should redirect unauthenticated user from dashboard to login', async () => {
      const request = createRequest(PATHS.DASHBOARD)

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.AUTH_LOGIN, request.url))
    })

    it('should redirect unauthenticated user from chat to login', async () => {
      const request = createRequest('/chat')

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.AUTH_LOGIN, request.url))
    })

    it('should allow unauthenticated user to access auth pages', async () => {
      const request = createRequest(PATHS.AUTH_LOGIN)

      await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })

    it('should allow unauthenticated user to access public pages', async () => {
      const request = createRequest('/')

      await middleware(request)

      expect(NextResponse.redirect).not.toHaveBeenCalled()
      expect(NextResponse.next).toHaveBeenCalled()
    })
  })

  describe('auth cookie detection', () => {
    it('should detect supabase auth cookie with different project ID', async () => {
      const request = createRequest(PATHS.AUTH_LOGIN, [
        { name: 'sb-different-project-auth-token', value: 'token456' }
      ])

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.DASHBOARD, request.url))
    })

    it('should not detect non-auth supabase cookies', async () => {
      const request = createRequest(PATHS.DASHBOARD, [
        { name: 'sb-test-session', value: 'session123' }
      ])

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.AUTH_LOGIN, request.url))
    })

    it('should not detect regular cookies', async () => {
      const request = createRequest(PATHS.DASHBOARD, [
        { name: 'regular-cookie', value: 'value' }
      ])

      await middleware(request)

      expect(NextResponse.redirect).toHaveBeenCalledWith(new URL(PATHS.AUTH_LOGIN, request.url))
    })
  })
})