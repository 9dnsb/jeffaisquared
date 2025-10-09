// jscpd:ignore-start - Test boilerplate patterns are inherently repetitive
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { TEST_CONSTANTS, authApiPatterns } from '../../../../test/test-utils'

// Mock auth-api-utils
vi.mock('@/lib/auth-api-utils', () => ({
  parseRequestBody: vi.fn(),
  handleSupabaseError: vi.fn(),
  createSuccessResponse: vi.fn(),
}))
// jscpd:ignore-end

// Mock supabase server client
const mockSupabaseClient = {
  auth: {
    resetPasswordForEmail: vi.fn(),
  },
}

vi.mock('../../../../../lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

// Test setup pattern similar to other auth tests
// jscpd:ignore-start
describe('/api/auth/forgot-password', () => {
  let authApiUtils: any
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    authApiUtils = await import('@/lib/auth-api-utils')
    supabase = mockSupabaseClient
  })
  // jscpd:ignore-end

  const validForgotPasswordData = {
    email: TEST_CONSTANTS.EMAIL,
    redirectTo: 'https://example.com/reset-password',
  }

  describe('POST', () => {
    it('should successfully send password reset email', async () => {
      const request = authApiPatterns.createMockRequest(validForgotPasswordData)
      const mockSuccessResponse = {
        message: 'Check your email for the password reset link!',
      }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validForgotPasswordData,
        error: null,
      })

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(
        request,
        expect.any(Object)
      )
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validForgotPasswordData.email,
        {
          redirectTo: validForgotPasswordData.redirectTo,
        }
      )
      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        message: 'Check your email for the password reset link!',
      })
      expect(response).toBe(mockSuccessResponse)
    })

    it('should return error when request parsing fails', async () => {
      const request = authApiPatterns.createMockRequest({})

      await authApiPatterns.testRequestParsingFailure(
        POST,
        request,
        authApiUtils,
        supabase
      )
    })

    it('should handle Supabase resetPasswordForEmail errors', async () => {
      const request = authApiPatterns.createMockRequest(validForgotPasswordData)
      const supabaseError = { message: 'Email not found' }
      const mockErrorResponse = { error: 'Email not found' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validForgotPasswordData,
        error: null,
      })

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: supabaseError,
      })

      authApiUtils.handleSupabaseError.mockReturnValue(mockErrorResponse)

      const response = await POST(request)

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validForgotPasswordData.email,
        {
          redirectTo: validForgotPasswordData.redirectTo,
        }
      )
      expect(authApiUtils.handleSupabaseError).toHaveBeenCalledWith(
        supabaseError
      )
      expect(response).toBe(mockErrorResponse)
    })

    it('should validate email format in request', async () => {
      const invalidData = {
        email: 'invalid-email',
        redirectTo: 'https://example.com/reset-password',
      }

      await authApiPatterns.testValidationFailure(
        POST,
        invalidData,
        authApiUtils,
        'Invalid email format'
      )
    })

    it('should validate redirectTo URL in request', async () => {
      const invalidData = {
        email: TEST_CONSTANTS.EMAIL,
        redirectTo: 'invalid-url',
      }

      await authApiPatterns.testValidationFailure(
        POST,
        invalidData,
        authApiUtils,
        'Invalid URL format'
      )
    })
  })
})
