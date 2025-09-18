import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TEST_CONSTANTS } from '../test/test-utils'
import {
  createErrorResponse,
  createSuccessResponse,
  handleAuthApiError,
  handleSupabaseError,
  parseRequestBody,
  validateSession
} from './auth-api-utils'

// Mock Next.js
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((data: Record<string, string | object>, options?: { status: number }) => ({
      json: data,
      status: options?.status || TEST_CONSTANTS.HTTP_200
    }))
  }
}))

// Mock supabase-server
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  }
}

vi.mock('../../lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Mock console methods to avoid noise in tests
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

// Helper functions to reduce duplication
const createMockRequest = (data: object) => ({
  json: vi.fn().mockResolvedValue(data)
} as Pick<Request, 'json'>)

const createMockRequestWithError = (error: Error) => ({
  json: vi.fn().mockRejectedValue(error)
} as Pick<Request, 'json'>)

const expectErrorResponse = (message: string, status: number) => {
  expect(NextResponse.json).toHaveBeenCalledWith(
    { error: message },
    { status }
  )
}

const expectSessionLog = (hasUser: boolean, error?: string) => {
  expect(consoleSpy).toHaveBeenCalledWith('Session validation:', {
    hasUser,
    error,
    supabaseUrl: 'https://kdarhqrcdrmuolswqfwi.supabase.co'
  })
}

const createEmailPasswordSchema = () => z.object({
  email: z.string().email(),
  password: z.string().min(TEST_CONSTANTS.MIN_PASSWORD_LENGTH)
})

const expectParseRequestResult = (result: { data: object; error?: object }, expectedData: object, hasError = false) => {
  expect(result.data).toEqual(expectedData)
  if (hasError) {
    expect(result.error).toBeDefined()
  } else {
    expect(result.error).toBeUndefined()
  }
}

const expectValidSessionResult = (result: { session: object | null; error?: object }, mockSession: object | null) => {
  expect(result.session).toEqual(mockSession)
  expect(result.error).toBeUndefined()
}

const expectInvalidSessionResult = (result: { session: object | null; error?: object }) => {
  expect(result.session).toBeNull()
  expect(result.error).toBeDefined()
}

const mockSupabaseSession = (user: object | null, error: object | null = null) => {
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user },
    error
  })
}

const testValidSessionScenario = async (mockUser: { id: string } | null, requireUser = false, expectLog = true) => {
  mockSupabaseSession(mockUser)
  const result = await validateSession(requireUser)
  const expectedSession = mockUser ? { user: { id: mockUser.id } } : null
  expectValidSessionResult(result, expectedSession)
  if (expectLog) {
    expectSessionLog(!!mockUser, undefined)
  }
  return result
}

const testAuthApiErrorResponse = (error: Error | object, expectedMessage: string, expectedStatus: number) => {
  const result = handleAuthApiError(error)
  expectErrorResponse(expectedMessage, expectedStatus)
  expect(result).toEqual({
    json: { error: expectedMessage },
    status: expectedStatus
  })
  return result
}

// Don't mock process.env - use actual environment variables

describe('auth-api-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createErrorResponse', () => {
    it('should create error response with message and status', () => {
      const result = createErrorResponse(TEST_CONSTANTS.TEST_ERROR_MESSAGE, TEST_CONSTANTS.HTTP_400)

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: TEST_CONSTANTS.TEST_ERROR_MESSAGE },
        { status: TEST_CONSTANTS.HTTP_400 }
      )
      expect(result).toEqual({
        json: { error: TEST_CONSTANTS.TEST_ERROR_MESSAGE },
        status: TEST_CONSTANTS.HTTP_400
      })
    })

    it('should create error response with different status codes', () => {
      createErrorResponse('Server error', TEST_CONSTANTS.HTTP_500)
      expectErrorResponse('Server error', TEST_CONSTANTS.HTTP_500)
    })
  })

  describe('createSuccessResponse', () => {
    it('should create success response with data and default status 200', () => {
      const data = { message: 'Success', user: { id: '123' } }
      const result = createSuccessResponse(data)

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: 200 })
      expect(result).toEqual({
        json: data,
        status: 200
      })
    })

    it('should create success response with custom status', () => {
      const data = { created: true }
      createSuccessResponse(data, TEST_CONSTANTS.HTTP_201)

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: TEST_CONSTANTS.HTTP_201 })
    })

    it('should handle various data types', () => {
      const data = {
        string: 'test',
        boolean: true,
        number: 42,
        nullValue: null,
        object: { nested: 'value' }
      }
      createSuccessResponse(data)

      expect(NextResponse.json).toHaveBeenCalledWith(data, { status: 200 })
    })
  })

  describe('handleAuthApiError', () => {
    it('should handle ZodError and return 400 status', () => {
      const schema = z.object({ email: z.string().email() })
      try {
        schema.parse({ email: 'invalid-email' })
      } catch (zodError) {
        const result = handleAuthApiError(zodError as z.ZodError)

        expectErrorResponse(TEST_CONSTANTS.INVALID_INPUT_MESSAGE, TEST_CONSTANTS.HTTP_400)
        expect(result).toEqual({
          json: { error: TEST_CONSTANTS.INVALID_INPUT_MESSAGE },
          status: TEST_CONSTANTS.HTTP_400
        })
      }
    })

    it('should handle regular Error and return 500 status', () => {
      const error = new Error('Something went wrong')
      testAuthApiErrorResponse(error, TEST_CONSTANTS.INTERNAL_SERVER_ERROR_MESSAGE, TEST_CONSTANTS.HTTP_500)
    })

    it('should handle generic object error and return 500 status', () => {
      const error = { message: 'Generic error object' }
      testAuthApiErrorResponse(error, TEST_CONSTANTS.INTERNAL_SERVER_ERROR_MESSAGE, TEST_CONSTANTS.HTTP_500)
    })
  })

  describe('handleSupabaseError', () => {
    it('should handle supabase error and return 400 status', () => {
      const error = { message: TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE }
      const result = handleSupabaseError(error)

      expectErrorResponse(TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE, TEST_CONSTANTS.HTTP_400)
      expect(result).toEqual({
        json: { error: TEST_CONSTANTS.INVALID_CREDENTIALS_MESSAGE },
        status: TEST_CONSTANTS.HTTP_400
      })
    })
  })

  describe('parseRequestBody', () => {
    it('should parse and validate valid request body', async () => {
      const schema = createEmailPasswordSchema()
      const testData = { email: TEST_CONSTANTS.EMAIL, password: 'password123' }
      const mockRequest = createMockRequest(testData)

      const result = await parseRequestBody(mockRequest as Request, schema)

      expectParseRequestResult(result, testData, false)
    })

    it('should handle invalid request body with validation error', async () => {
      const schema = createEmailPasswordSchema()
      const invalidData = { email: 'invalid-email', password: '123' }
      const mockRequest = createMockRequest(invalidData)

      const result = await parseRequestBody(mockRequest as Request, schema)

      expectParseRequestResult(result, {}, true)
      expectErrorResponse(TEST_CONSTANTS.INVALID_INPUT_MESSAGE, TEST_CONSTANTS.HTTP_400)
    })

    it('should handle JSON parsing error', async () => {
      const schema = z.object({ test: z.string() })
      const mockRequest = createMockRequestWithError(new Error('Invalid JSON'))

      const result = await parseRequestBody(mockRequest as Request, schema)

      expectParseRequestResult(result, {}, true)
      expectErrorResponse(TEST_CONSTANTS.INTERNAL_SERVER_ERROR_MESSAGE, TEST_CONSTANTS.HTTP_500)
    })
  })

  describe('validateSession', () => {
    it('should return session when valid session exists', async () => {
      const mockUser = { id: 'user-123' }
      await testValidSessionScenario(mockUser, false, true)
    })

    it('should return session when valid session exists and requireUser is true', async () => {
      const mockUser = { id: 'user-123' }
      await testValidSessionScenario(mockUser, true, false)
    })

    it('should return error when Supabase returns error', async () => {
      const supabaseError = { message: 'Token expired' }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: supabaseError
      })

      const result = await validateSession()

      expectInvalidSessionResult(result)
      expect(consoleErrorSpy).toHaveBeenCalledWith('Supabase auth error:', supabaseError)
      expectErrorResponse('Token expired', TEST_CONSTANTS.HTTP_401)
    })

    it('should return error when no session exists', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await validateSession()

      expectInvalidSessionResult(result)
      expectErrorResponse(TEST_CONSTANTS.NO_ACTIVE_SESSION_MESSAGE, TEST_CONSTANTS.HTTP_401)
      expectSessionLog(false, undefined)
    })

    it('should return error when session exists but no user and requireUser is true', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await validateSession(true)

      expectInvalidSessionResult(result)
      expectErrorResponse(TEST_CONSTANTS.NO_ACTIVE_SESSION_MESSAGE, TEST_CONSTANTS.HTTP_401)
    })

    it('should return error when session exists with null user and requireUser is false', async () => {
      mockSupabaseSession(null)
      const result = await validateSession(false)
      expectInvalidSessionResult(result)
      expectErrorResponse(TEST_CONSTANTS.NO_ACTIVE_SESSION_MESSAGE, TEST_CONSTANTS.HTTP_401)
      expectSessionLog(false, undefined)
    })
  })
})