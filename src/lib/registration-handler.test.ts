import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleRegistration } from './registration-handler'
import { TEST_CONSTANTS } from '../test/test-utils'

// Mock NextRequest
const mockRequest = (body: any): any => ({
  json: vi.fn().mockResolvedValue(body)
})

// Mock auth-api-utils
vi.mock('./auth-api-utils', () => ({
  parseRequestBody: vi.fn(),
  handleSupabaseError: vi.fn(),
  createSuccessResponse: vi.fn(),
  createErrorResponse: vi.fn()
}))

// Mock profile-utils
vi.mock('./profile-utils', () => ({
  ensureUserProfile: vi.fn()
}))

// Mock supabase client
vi.mock('../../lib/supabase', () => ({
  default: {
    auth: {
      signUp: vi.fn()
    }
  }
}))

describe('registration-handler', () => {
  let authApiUtils: any
  let supabase: any
  let profileUtils: any
  let mockPrismaClient: any


  beforeEach(async () => {
    vi.clearAllMocks()
    console.log = vi.fn()
    console.error = vi.fn()

    authApiUtils = await import('./auth-api-utils')
    supabase = (await import('../../lib/supabase')).default
    profileUtils = await import('./profile-utils')

    // Create mock Prisma client
    mockPrismaClient = {
      $disconnect: vi.fn().mockResolvedValue(undefined)
    }

    // Mock setTimeout for the trigger wait
    vi.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback()
      return {} as any
    })
  })

  const validRegisterData = {
    email: TEST_CONSTANTS.EMAIL,
    password: TEST_CONSTANTS.PASSWORD,
    firstName: 'John',
    lastName: 'Doe'
  }

  describe('handleRegistration', () => {
    it('should call prisma.$disconnect in finally block on successful registration', async () => {
      const request = mockRequest(validRegisterData)
      const mockUser = { id: '123', email: TEST_CONSTANTS.EMAIL }
      const mockSession = { access_token: 'token123' }
      const mockSuccessResponse = {
        user: mockUser,
        session: mockSession,
        message: 'Check your email for the confirmation link!'
      }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validRegisterData,
        error: null
      })

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      profileUtils.ensureUserProfile.mockResolvedValue(undefined)
      authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockSuccessResponse)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should call prisma.$disconnect in finally block on parsing error', async () => {
      const request = mockRequest({})
      const mockParseError = { error: 'Invalid email format' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: null,
        error: mockParseError
      })

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockParseError)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should call prisma.$disconnect in finally block on Supabase error', async () => {
      const request = mockRequest(validRegisterData)
      const supabaseError = { message: 'User already exists' }
      const mockErrorResponse = { error: 'User already exists' }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validRegisterData,
        error: null
      })

      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: supabaseError
      })

      authApiUtils.handleSupabaseError.mockReturnValue(mockErrorResponse)

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockErrorResponse)
      expect(console.error).toHaveBeenCalledWith('Supabase signup error:', supabaseError)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should call prisma.$disconnect in finally block when user is null', async () => {
      const request = mockRequest(validRegisterData)
      const mockErrorResponse = { error: 'User creation failed', status: TEST_CONSTANTS.HTTP_500 }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validRegisterData,
        error: null
      })

      supabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null
      })

      authApiUtils.createErrorResponse.mockReturnValue(mockErrorResponse)

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockErrorResponse)
      expect(authApiUtils.createErrorResponse).toHaveBeenCalledWith('User creation failed', TEST_CONSTANTS.HTTP_500)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should call prisma.$disconnect in finally block on unexpected error', async () => {
      const request = mockRequest(validRegisterData)
      const testError = new Error('Unexpected error')
      const mockErrorResponse = { error: TEST_CONSTANTS.REGISTRATION_FAILED_MESSAGE, status: TEST_CONSTANTS.HTTP_500 }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validRegisterData,
        error: null
      })

      // Mock supabase throwing an unexpected error
      supabase.auth.signUp.mockRejectedValue(testError)

      authApiUtils.createErrorResponse.mockReturnValue(mockErrorResponse)

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockErrorResponse)
      expect(console.error).toHaveBeenCalledWith('Registration error:', testError)
      expect(authApiUtils.createErrorResponse).toHaveBeenCalledWith(TEST_CONSTANTS.REGISTRATION_FAILED_MESSAGE, TEST_CONSTANTS.HTTP_500)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should call prisma.$disconnect in finally block when ensureUserProfile throws error', async () => {
      const request = mockRequest(validRegisterData)
      const mockUser = { id: '123', email: TEST_CONSTANTS.EMAIL }
      const mockSession = { access_token: 'token123' }
      const profileError = new Error('Profile creation failed')
      const mockErrorResponse = { error: TEST_CONSTANTS.REGISTRATION_FAILED_MESSAGE, status: TEST_CONSTANTS.HTTP_500 }

      authApiUtils.parseRequestBody.mockResolvedValue({
        data: validRegisterData,
        error: null
      })

      supabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      })

      // Mock ensureUserProfile throwing an error
      profileUtils.ensureUserProfile.mockRejectedValue(profileError)
      authApiUtils.createErrorResponse.mockReturnValue(mockErrorResponse)

      const response = await handleRegistration(request, mockPrismaClient)

      expect(response).toBe(mockErrorResponse)
      expect(console.error).toHaveBeenCalledWith('Registration error:', profileError)
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })
  })
})