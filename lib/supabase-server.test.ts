import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TEST_CONSTANTS } from '../src/test/test-utils'

// Mock dependencies
const mockServerClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

const mockCreateServerClient = vi.fn(() => mockServerClient)
const mockCookies = vi.fn()
const mockCookieStore = {
  getAll: vi.fn(() => [{ name: TEST_CONSTANTS.TEST_COOKIE_NAME, value: TEST_CONSTANTS.TEST_COOKIE_VALUE }]),
  set: vi.fn()
}

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient
}))

vi.mock('next/headers', () => ({
  cookies: mockCookies
}))

describe('supabase-server', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockCookies.mockResolvedValue(mockCookieStore)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should create server client with cookies integration', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    const { createSupabaseServerClient } = await import('./supabase-server')
    const client = await createSupabaseServerClient()

    expect(mockCookies).toHaveBeenCalledOnce()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      TEST_CONSTANTS.TEST_SUPABASE_URL,
      TEST_CONSTANTS.TEST_ANON_KEY,
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function)
        })
      })
    )
    expect(client).toBe(mockServerClient)
  })

  it('should throw error when environment variables are missing', async () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL']
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

    await expect(import('./supabase-server')).rejects.toThrow(
      TEST_CONSTANTS.MISSING_SUPABASE_ENV_ERROR
    )
  })

  it('should handle cookie getAll functionality', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    const { createSupabaseServerClient } = await import('./supabase-server')
    await createSupabaseServerClient()

    const callArgs = (mockCreateServerClient.mock.calls[0] as any) || []
    const cookiesConfig = callArgs[2]?.cookies
    const result = cookiesConfig?.getAll?.()

    expect(mockCookieStore.getAll).toHaveBeenCalledOnce()
    expect(result).toEqual([{ name: TEST_CONSTANTS.TEST_COOKIE_NAME, value: TEST_CONSTANTS.TEST_COOKIE_VALUE }])
  })

  it('should handle cookie setAll functionality successfully', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    const { createSupabaseServerClient } = await import('./supabase-server')
    await createSupabaseServerClient()

    const callArgs = (mockCreateServerClient.mock.calls[0] as any) || []
    const cookiesConfig = callArgs[2]?.cookies
    const cookiesToSet = [
      { name: TEST_CONSTANTS.AUTH_TOKEN_COOKIE, value: TEST_CONSTANTS.TOKEN_VALUE, options: { httpOnly: true } }
    ]

    cookiesConfig?.setAll?.(cookiesToSet)

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      TEST_CONSTANTS.AUTH_TOKEN_COOKIE,
      TEST_CONSTANTS.TOKEN_VALUE,
      { httpOnly: true }
    )
  })

  it('should handle cookie setAll functionality with errors gracefully', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = TEST_CONSTANTS.TEST_SUPABASE_URL
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = TEST_CONSTANTS.TEST_ANON_KEY

    // Mock cookieStore.set to throw an error
    mockCookieStore.set.mockImplementation(() => {
      throw new Error(TEST_CONSTANTS.COOKIE_ERROR_MESSAGE)
    })

    const { createSupabaseServerClient } = await import('./supabase-server')
    await createSupabaseServerClient()

    const callArgs = (mockCreateServerClient.mock.calls[0] as any) || []
    const cookiesConfig = callArgs[2]?.cookies
    const cookiesToSet = [
      { name: TEST_CONSTANTS.AUTH_TOKEN_COOKIE, value: TEST_CONSTANTS.TOKEN_VALUE, options: { httpOnly: true } }
    ]

    // Should not throw error, should handle gracefully
    expect(() => cookiesConfig?.setAll?.(cookiesToSet)).not.toThrow()
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      TEST_CONSTANTS.AUTH_TOKEN_COOKIE,
      TEST_CONSTANTS.TOKEN_VALUE,
      { httpOnly: true }
    )
  })
})