// jscpd:ignore-start
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET } from './route'
import { TEST_CONSTANTS } from '../../../../test/test-utils'

// Mock NextRequest
const mockRequest = (body: any): any => ({
  json: vi.fn().mockResolvedValue(body)
})

// Mock auth-api-utils
vi.mock('@/lib/auth-api-utils', () => ({
  parseRequestBody: vi.fn(),
  handleSupabaseError: vi.fn(),
  createSuccessResponse: vi.fn(),
  validateSession: vi.fn()
}))
// jscpd:ignore-end

// Mock supabase client
vi.mock('../../../../../lib/supabase', () => ({
  default: {
    auth: {
      updateUser: vi.fn()
    }
  }
}))

// Test setup pattern similar to other auth tests
// jscpd:ignore-start
describe('/api/auth/reset-password', () => {
  let authApiUtils: any
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    authApiUtils = await import('@/lib/auth-api-utils')
    supabase = (await import('../../../../../lib/supabase')).default
  })
  // jscpd:ignore-end

  describe('POST', () => {
    const validResetPasswordData = {
      password: 'newpassword123'
    }

    // jscpd:ignore-start - Test assertion patterns are inherently repetitive across test files
    it('should successfully update user password', async () => {
      const request = mockRequest(validResetPasswordData)
      const mockSuccessResponse = {
        message: 'Password updated successfully!'
      }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validResetPasswordData,
        error: null
      })

      supabase.auth.updateUser.mockResolvedValue({
        error: null
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: validResetPasswordData.password
      })
      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        message: 'Password updated successfully!'
      })
      expect(response).toBe(mockSuccessResponse)
    })
    // jscpd:ignore-end

    // jscpd:ignore-start - Standard error handling test patterns
    it('should return error when request parsing fails', async () => {
      const request = mockRequest({})
      const mockParseError = { error: 'Password too short' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
      expect(response).toBe(mockParseError)
    })
    // jscpd:ignore-end

    it('should handle Supabase updateUser errors', async () => {
      const request = mockRequest(validResetPasswordData)
      const supabaseError = { message: 'Session expired' }
      const mockErrorResponse = { error: 'Session expired' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validResetPasswordData,
        error: null
      })

      supabase.auth.updateUser.mockResolvedValue({
        error: supabaseError
      })

      authApiUtils.handleSupabaseError.mockReturnValue(mockErrorResponse)

      const response = await POST(request)

      expect(supabase.auth.updateUser).toHaveBeenCalledWith({
        password: validResetPasswordData.password
      })
      expect(authApiUtils.handleSupabaseError).toHaveBeenCalledWith(supabaseError)
      expect(response).toBe(mockErrorResponse)
    })

    it('should validate minimum password length', async () => {
      const shortPasswordData = {
        password: '123' // Less than 6 characters
      }
      const request = mockRequest(shortPasswordData)
      const mockParseError = { error: 'Password must be at least 6 characters' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabase.auth.updateUser).not.toHaveBeenCalled()
      expect(response).toBe(mockParseError)
    })
  })

  describe('GET', () => {
    it('should return valid session when user is authenticated', async () => {
      const mockSession = {
        user: { id: TEST_CONSTANTS.USER_ID, email: TEST_CONSTANTS.EMAIL },
        access_token: 'token123'
      }
      const mockSuccessResponse = {
        isValid: true,
        session: mockSession
      }

      authApiUtils.validateSession.mockResolvedValue({
        session: mockSession,
        error: null
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await GET()

      expect(authApiUtils.validateSession).toHaveBeenCalledWith()
      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        isValid: true,
        session: mockSession
      })
      expect(response).toBe(mockSuccessResponse)
    })

    it('should return error when session validation fails', async () => {
      const mockError = {
        error: 'Unauthorized',
        status: 401
      }

      authApiUtils.validateSession.mockResolvedValue({
        session: null,
        error: mockError
      })

      const response = await GET()

      expect(authApiUtils.validateSession).toHaveBeenCalledWith()
      expect(authApiUtils.createSuccessResponse).not.toHaveBeenCalled()
      expect(response).toBe(mockError)
    })

    it('should handle session validation with null session', async () => {
      const mockError = {
        error: 'No active session',
        status: 401
      }

      authApiUtils.validateSession.mockResolvedValue({
        session: null,
        error: mockError
      })

      const response = await GET()

      expect(authApiUtils.validateSession).toHaveBeenCalledWith()
      expect(response).toBe(mockError)
    })
  })
})