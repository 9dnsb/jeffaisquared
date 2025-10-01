// jscpd:ignore-start
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { TEST_CONSTANTS, authApiPatterns } from '../../../../test/test-utils'

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

  const loginAttemptMessage = 'Login attempt:'

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

  // Test patterns require similar setup with different assertions
  // jscpd:ignore-start
  describe('POST', () => {
    it('should successfully login user with valid credentials', async () => {
      const loginData = {
        email: TEST_CONSTANTS.EMAIL,
        password: TEST_CONSTANTS.PASSWORD
      }
      const request = authApiPatterns.createMockRequest(loginData)

      const mockUser = { id: TEST_CONSTANTS.USER_ID, email: TEST_CONSTANTS.EMAIL }
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
      const request = authApiPatterns.createMockRequest({})

      // Mock supabaseServer to not be called
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: vi.fn()
        }
      }

      await authApiPatterns.testRequestParsingFailure(
        POST,
        request,
        authApiUtils,
        mockSupabaseClient
      )

      expect(supabaseServer.createSupabaseServerClient).not.toHaveBeenCalled()
    })

    it('should handle Supabase authentication errors', async () => {
      const loginData = {
        email: TEST_CONSTANTS.EMAIL,
        password: 'wrongpassword'
      }
      const request = authApiPatterns.createMockRequest(loginData)
      const supabaseError = { message: TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE }
      const mockErrorResponse = { error: TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE }

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
        error: TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE,
        hasUser: false,
        hasSession: false
      })
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle successful login with user but no session', async () => {
      const loginData = {
        email: TEST_CONSTANTS.EMAIL,
        password: TEST_CONSTANTS.PASSWORD
      }
      const request = authApiPatterns.createMockRequest(loginData)

      const mockUser = { id: TEST_CONSTANTS.USER_ID, email: TEST_CONSTANTS.EMAIL }
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
  // jscpd:ignore-end
})