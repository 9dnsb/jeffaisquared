import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createResponse, hookPatterns } from '../test/test-utils'

// jscpd:ignore-start
// Mock Next.js navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch
// jscpd:ignore-end

import { useAuthRedirect } from './useAuthRedirect'

describe('useAuthRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with isCheckingSession true', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

    const { result } = renderHook(() => useAuthRedirect())

    expect(result.current).toBe(true) // isCheckingSession
  })

  it('should redirect to dashboard when user is authenticated', async () => {
    await hookPatterns.testAuthRedirectScenario(
      mockFetch,
      mockPush,
      useAuthRedirect,
      createResponse.success({ authenticated: true }),
      true
    )
  })

  it('should not redirect when user is not authenticated', async () => {
    await hookPatterns.testAuthRedirectScenario(
      mockFetch,
      mockPush,
      useAuthRedirect,
      createResponse.success({ authenticated: false }),
      false
    )
  })

  it('should not redirect when session API returns error response', async () => {
    await hookPatterns.testAuthRedirectScenario(
      mockFetch,
      mockPush,
      useAuthRedirect,
      createResponse.error({ error: 'Unauthorized' }),
      false
    )
  })

  it('should not redirect when fetch throws an error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useAuthRedirect())

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)
    hookPatterns.expectSessionApiCall(mockFetch)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should handle response.ok true but authenticated false', async () => {
    // jscpd:ignore-start
    mockFetch.mockResolvedValueOnce(createResponse.success({ authenticated: false }))

    const { result } = renderHook(() => useAuthRedirect())

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)

    expect(mockPush).not.toHaveBeenCalled()
    // jscpd:ignore-end
  })

  it('should handle response.ok false but authenticated true', async () => {
    // jscpd:ignore-start
    mockFetch.mockResolvedValueOnce(createResponse.error({ authenticated: true }))

    const { result } = renderHook(() => useAuthRedirect())

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)

    expect(mockPush).not.toHaveBeenCalled()
    // jscpd:ignore-end
  })

  it('should set isCheckingSession to false after successful check', async () => {
    // jscpd:ignore-start
    mockFetch.mockResolvedValueOnce(createResponse.success({ authenticated: true }))

    const { result } = renderHook(() => useAuthRedirect())

    expect(result.current).toBe(true)

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)
    // jscpd:ignore-end
  })

  it('should set isCheckingSession to false after failed check', async () => {
    // jscpd:ignore-start
    mockFetch.mockRejectedValueOnce(new Error('Failed'))

    const { result } = renderHook(() => useAuthRedirect())

    expect(result.current).toBe(true)

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)
    // jscpd:ignore-end
  })
})