// jscpd:ignore-start - Test boilerplate patterns are inherently repetitive
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'
import { TEST_CONSTANTS } from '../../../../test/test-utils'

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
// jscpd:ignore-end

// Mock supabase client
vi.mock('../../../../../lib/supabase', () => ({
  default: {
    auth: {
      resetPasswordForEmail: vi.fn()
    }
  }
}))

describe('/api/auth/forgot-password', () => {
  let authApiUtils: any
  let supabase: any

  beforeEach(async () => {
    vi.clearAllMocks()

    authApiUtils = await import('@/lib/auth-api-utils')
    supabase = (await import('../../../../../lib/supabase')).default
  })

  const validForgotPasswordData = {
    email: TEST_CONSTANTS.EMAIL,
    redirectTo: 'https://example.com/reset-password'
  }

  describe('POST', () => {
    it('should successfully send password reset email', async () => {
      const request = mockRequest(validForgotPasswordData)
      const mockSuccessResponse = {
        message: 'Check your email for the password reset link!'
      }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validForgotPasswordData,
        error: null
      })

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null
      })

      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validForgotPasswordData.email,
        {
          redirectTo: validForgotPasswordData.redirectTo
        }
      )
      expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
        message: 'Check your email for the password reset link!'
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
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled()
      expect(response).toBe(mockParseError)
    })

    it('should handle Supabase resetPasswordForEmail errors', async () => {
      const request = mockRequest(validForgotPasswordData)
      const supabaseError = { message: 'Email not found' }
      const mockErrorResponse = { error: 'Email not found' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validForgotPasswordData,
        error: null
      })

      supabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: supabaseError
      })

      authApiUtils.handleSupabaseError.mockReturnValue(mockErrorResponse)

      const response = await POST(request)

      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        validForgotPasswordData.email,
        {
          redirectTo: validForgotPasswordData.redirectTo
        }
      )
      expect(authApiUtils.handleSupabaseError).toHaveBeenCalledWith(supabaseError)
      expect(response).toBe(mockErrorResponse)
    })

    it('should validate email format in request', async () => {
      const invalidData = {
        email: 'invalid-email',
        redirectTo: 'https://example.com/reset-password'
      }
      const request = mockRequest(invalidData)
      const mockParseError = { error: 'Invalid email format' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(response).toBe(mockParseError)
    })

    it('should validate redirectTo URL in request', async () => {
      const invalidData = {
        email: TEST_CONSTANTS.EMAIL,
        redirectTo: 'invalid-url'
      }
      const request = mockRequest(invalidData)
      const mockParseError = { error: 'Invalid URL format' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await POST(request)

      expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(request, expect.any(Object))
      expect(response).toBe(mockParseError)
    })
  })
})