// jscpd:ignore-start - Test boilerplate patterns are inherently repetitive
import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest'
import { NextResponse } from 'next/server'
import { POST } from './route'
import { handleRegistration } from '@/lib/registration-handler'
import { TEST_CONSTANTS } from '../../../../test/test-utils'

// Mock NextRequest
const mockRequest = (body: any): any => ({
  json: vi.fn().mockResolvedValue(body)
})

// Mock registration-handler
vi.mock('@/lib/registration-handler', () => ({
  handleRegistration: vi.fn()
}))

const mockHandleRegistration = handleRegistration as MockedFunction<typeof handleRegistration>
// jscpd:ignore-end

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validRegisterData = {
    email: TEST_CONSTANTS.EMAIL,
    password: TEST_CONSTANTS.PASSWORD,
    firstName: 'John',
    lastName: 'Doe'
  }

  describe('POST', () => {
    it('should call handleRegistration with request and prisma client', async () => {
      const request = mockRequest(validRegisterData)
      const mockResponse = NextResponse.json({ message: 'Registration successful' })

      mockHandleRegistration.mockResolvedValue(mockResponse)

      const response = await POST(request)

      expect(mockHandleRegistration).toHaveBeenCalledWith(request, expect.any(Object))
      expect(response).toBe(mockResponse)
    })
  })
})