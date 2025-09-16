import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock the auth-api-utils module
vi.mock('@/lib/auth-api-utils', () => ({
  createSuccessResponse: vi.fn(),
  validateSession: vi.fn()
}))

describe('/api/auth/session', () => {
  let authApiUtils: any

  beforeEach(async () => {
    vi.clearAllMocks()
    authApiUtils = await import('@/lib/auth-api-utils')
  })

  const setupSuccessTest = (mockSession: any, mockSuccessResponse: any) => {
    authApiUtils.validateSession.mockResolvedValue({
      session: mockSession,
      error: null
    })
    authApiUtils.createSuccessResponse.mockReturnValue(mockSuccessResponse)
  }

  const expectSuccessTest = (mockSession: any) => {
    expect(authApiUtils.validateSession).toHaveBeenCalledWith(true)
    expect(authApiUtils.createSuccessResponse).toHaveBeenCalledWith({
      authenticated: true,
      user: mockSession.user,
      session: mockSession
    })
  }

  describe('GET', () => {
    it('should return authenticated response when session is valid', async () => {
      const mockSession = {
        user: { id: '123', email: 'test@example.com' }
      }
      const mockSuccessResponse = {
        json: () => Promise.resolve({ authenticated: true, user: mockSession.user })
      }

      setupSuccessTest(mockSession, mockSuccessResponse)

      const response = await GET()

      expectSuccessTest(mockSession)
      expect(response).toBe(mockSuccessResponse)
    })

    it('should return error response when session validation fails', async () => {
      const mockError = {
        json: () => Promise.resolve({ error: 'Unauthorized' })
      }

      authApiUtils.validateSession.mockResolvedValue({
        session: null,
        error: mockError
      })

      const response = await GET()

      expect(authApiUtils.validateSession).toHaveBeenCalledWith(true)
      expect(response).toBe(mockError)
      expect(authApiUtils.createSuccessResponse).not.toHaveBeenCalled()
    })

    it('should handle session with null user', async () => {
      const mockSession = {
        user: null
      }
      const mockSuccessResponse = {
        json: () => Promise.resolve({ authenticated: true, user: null })
      }

      setupSuccessTest(mockSession, mockSuccessResponse)

      const response = await GET()

      expectSuccessTest(mockSession)
      expect(response).toBe(mockSuccessResponse)
    })
  })
})