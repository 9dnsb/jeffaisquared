// jscpd:ignore-start - Test boilerplate patterns are inherently repetitive
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock NextRequest
const mockRequest = (body: any): any => ({
  json: vi.fn().mockResolvedValue(body)
})

// Mock auth-api-utils
vi.mock('@/lib/auth-api-utils', () => ({
  parseRequestBody: vi.fn(),
  handleSupabaseError: vi.fn(),
  createSuccessResponse: vi.fn()
}))

// Mock supabase server client
vi.mock('../../../../../lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn()
}))
// jscpd:ignore-end

describe('/api/auth/login', () => {
  let authApiUtils: any
  let supabaseServer: any
  let mockSupabaseClient: any
  let mockSignInWithPassword: any

  const testEmail = 'test@example.com'
  const testPassword = 'password123'
  const testUserId = '123'
  const loginAttemptMessage = 'Login attempt:'
  const invalidCredentialsMessage = 'Invalid credentials'

  beforeEach(async () => {
    vi.clearAllMocks()
    console.log = vi.fn()

    authApiUtils = await import('@/lib/auth-api-utils')
    supabaseServer = await import('../../../../../lib/supabase-server')

    mockSignInWithPassword = vi.fn()
    mockSupabaseClient = {
      auth: {
        signInWithPassword: mockSignInWithPassword
      }
    }
    supabaseServer.createSupabaseServerClient.mockResolvedValue(mockSupabaseClient)
  })

  describe('POST', () => {
    it('should successfully login user with valid credentials', async () => {
      const loginData = {
        email: testEmail,
        password: testPassword
      }
      const request = mockRequest(loginData)

      const mockUser = { id: testUserId, email: testEmail }
      const mockSession = { access_token: 'token123' }
      const mockSuccessResponse = { user: mockUser, session: mockSession }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: loginData,
        error: null
      })

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabaseServer.createSupabaseServerClient).toHaveBeenCalled()
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: loginData.email,
        password: loginData.password
      })
      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        user: mockUser,
        session: mockSession
      })
      expect(console.log).toHaveBeenCalledWith(loginAttemptMessage, {
        email: loginData.email,
        success: true,
        error: undefined,
        hasUser: true,
        hasSession: true
      })
      expect(response).toBe(mockSuccessResponse)
    })

    it('should return error when request parsing fails', async () => {
      const request = mockRequest({})
      const mockParseError = { error: 'Invalid email format' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabaseServer.createSupabaseServerClient).not.toHaveBeenCalled()
      expect(response).toBe(mockParseError)
    })

    it('should handle Supabase authentication errors', async () => {
      const loginData = {
        email: testEmail,
        password: 'wrongpassword'
      }
      const request = mockRequest(loginData)
      const supabaseError = { message: invalidCredentialsMessage }
      const mockErrorResponse = { error: invalidCredentialsMessage }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: loginData,
        error: null
      })

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError
      })

      authApiUtils.handleSupabaseError.mockReturnValue(mockErrorResponse)

      const response = await POST(request)

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: loginData.email,
        password: loginData.password
      })
      expect(authApiUtils.handleSupabaseError).toHaveBeenCalledWith(supabaseError)
      expect(console.log).toHaveBeenCalledWith(loginAttemptMessage, {
        email: loginData.email,
        success: false,
        error: invalidCredentialsMessage,
        hasUser: false,
        hasSession: false
      })
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle successful login with user but no session', async () => {
      const loginData = {
        email: testEmail,
        password: testPassword
      }
      const request = mockRequest(loginData)

      const mockUser = { id: testUserId, email: testEmail }
      const mockSuccessResponse = { user: mockUser, session: null }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: loginData,
        error: null
      })

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await POST(request)

      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        user: mockUser,
        session: null
      })
      expect(console.log).toHaveBeenCalledWith(loginAttemptMessage, {
        email: loginData.email,
        success: true,
        error: undefined,
        hasUser: true,
        hasSession: false
      })
      expect(response).toBe(mockSuccessResponse)
    })
  })
})