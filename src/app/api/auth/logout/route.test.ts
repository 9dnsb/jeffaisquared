import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from './route'

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn()
  }
}))

// Mock Supabase server client
vi.mock('../../../../../lib/supabase-server', () => ({
  createSupabaseServerClient: vi.fn()
}))

describe('/api/auth/logout', () => {
  let NextResponse: any
  let supabaseServer: any
  let mockSignOut: any
  let mockSupabaseClient: any

  const ERROR_MESSAGES = {
    SIGN_OUT_FAILED: 'Sign out failed',
    INTERNAL_SERVER_ERROR: 'Internal server error'
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    console.log = vi.fn()
    console.error = vi.fn()
    NextResponse = (await import('next/server')).NextResponse
    supabaseServer = await import('../../../../../lib/supabase-server')

    mockSignOut = vi.fn()
    mockSupabaseClient = {
      auth: {
        signOut: mockSignOut
      }
    }
    supabaseServer.createSupabaseServerClient.mockResolvedValue(mockSupabaseClient)
  })

  describe('POST', () => {
    it('should successfully sign out user', async () => {
      const mockSuccessResponse = { message: 'Successfully signed out' }

      mockSignOut.mockResolvedValue({ error: null })
      NextResponse.json.mockReturnValue(mockSuccessResponse)

      const response = await POST()

      expect(supabaseServer.createSupabaseServerClient).toHaveBeenCalled()
      expect(mockSignOut).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith({
        message: 'Successfully signed out'
      })
      expect(console.log).toHaveBeenCalledWith('Logout attempt:', {
        success: true,
        error: undefined
      })
      expect(response).toBe(mockSuccessResponse)
    })

    it('should return error when signOut fails', async () => {
      const error = new Error(ERROR_MESSAGES.SIGN_OUT_FAILED)
      const mockErrorResponse = { error: ERROR_MESSAGES.SIGN_OUT_FAILED }

      mockSignOut.mockResolvedValue({ error })
      NextResponse.json.mockReturnValue(mockErrorResponse)

      const response = await POST()

      expect(mockSignOut).toHaveBeenCalled()
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: ERROR_MESSAGES.SIGN_OUT_FAILED },
        { status: 400 }
      )
      expect(console.log).toHaveBeenCalledWith('Logout attempt:', {
        success: false,
        error: ERROR_MESSAGES.SIGN_OUT_FAILED
      })
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error')
      const mockErrorResponse = { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }

      supabaseServer.createSupabaseServerClient.mockRejectedValue(unexpectedError)
      NextResponse.json.mockReturnValue(mockErrorResponse)

      const response = await POST()

      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
        { status: 500 }
      )
      expect(console.error).toHaveBeenCalledWith('Logout error:', unexpectedError)
      expect(response).toBe(mockErrorResponse)
    })

    it('should handle supabase client creation failure', async () => {
      const clientError = new Error('Failed to create client')
      const mockErrorResponse = { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR }

      supabaseServer.createSupabaseServerClient.mockRejectedValue(clientError)
      NextResponse.json.mockReturnValue(mockErrorResponse)

      const response = await POST()

      expect(console.error).toHaveBeenCalledWith('Logout error:', clientError)
      expect(NextResponse.json).toHaveBeenCalledWith(
        { error: ERROR_MESSAGES.INTERNAL_SERVER_ERROR },
        { status: 500 }
      )
      expect(response).toBe(mockErrorResponse)
    })
  })
})