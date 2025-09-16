import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { TEST_CONSTANTS, testHelpers, hookPatterns, asyncTestPatterns } from '../test/test-utils'

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

import { useAuthForm } from './useAuthForm'

describe('useAuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useAuthForm({ endpoint: '/api/auth/test' })
    )

    testHelpers.expectLoadingState(result)
    expect(typeof result.current.submitForm).toBe('function')
    expect(typeof result.current.setError).toBe('function')
    expect(typeof result.current.setMessage).toBe('function')
  })

  it('should handle successful form submission with user and redirect', async () => {
    testHelpers.setupSuccessResponse(mockFetch)

    const { result } = renderHook(() =>
      useAuthForm({
        endpoint: TEST_CONSTANTS.LOGIN_ENDPOINT,
        redirectTo: TEST_CONSTANTS.DASHBOARD_PATH
      })
    )

    await act(async () => {
      await result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    hookPatterns.expectAuthFormSubmissionCall(mockFetch, TEST_CONSTANTS.LOGIN_ENDPOINT, { email: TEST_CONSTANTS.EMAIL })

    testHelpers.expectSuccessState(result, TEST_CONSTANTS.SUCCESS_MESSAGE)
    expect(mockPush).toHaveBeenCalledWith(TEST_CONSTANTS.DASHBOARD_PATH)
  })

  it('should handle successful submission with custom onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const responseData = { user: { id: TEST_CONSTANTS.USER_ID }, message: TEST_CONSTANTS.SUCCESS_MESSAGE }
    testHelpers.setupSuccessResponse(mockFetch, responseData)

    const { result } = renderHook(() =>
      useAuthForm({
        endpoint: TEST_CONSTANTS.REGISTER_ENDPOINT,
        redirectTo: TEST_CONSTANTS.DASHBOARD_PATH,
        onSuccess
      })
    )

    await act(async () => {
      await result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    expect(onSuccess).toHaveBeenCalledWith(responseData)
    expect(mockPush).not.toHaveBeenCalled()
    expect(result.current.loading).toBe(false)
  })

  it('should handle success response with message only', async () => {
    testHelpers.setupSuccessResponse(mockFetch, { message: TEST_CONSTANTS.PASSWORD_RESET_MESSAGE })

    const { result } = renderHook(() =>
      useAuthForm({ endpoint: TEST_CONSTANTS.FORGOT_PASSWORD_ENDPOINT })
    )

    await act(async () => {
      await result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    testHelpers.expectSuccessState(result, TEST_CONSTANTS.PASSWORD_RESET_MESSAGE)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('should handle API error response', async () => {
    await asyncTestPatterns.testErrorHandling(
      testHelpers.setupErrorResponse,
      TEST_CONSTANTS.ERROR_MESSAGE,
      mockFetch,
      useAuthForm,
      { error: TEST_CONSTANTS.ERROR_MESSAGE }
    )
  })

  it('should handle API error response without error message', async () => {
    // Directly set up error response without error message
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({})
    })

    const { result } = renderHook(() =>
      useAuthForm({ endpoint: TEST_CONSTANTS.LOGIN_ENDPOINT })
    )

    await act(async () => {
      await result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    testHelpers.expectErrorState(result, TEST_CONSTANTS.REQUEST_FAILED_MESSAGE)
  })

  it('should handle network error', async () => {
    await asyncTestPatterns.testErrorHandling(
      testHelpers.setupNetworkError,
      TEST_CONSTANTS.NETWORK_ERROR_MESSAGE,
      mockFetch,
      useAuthForm
    )
  })

  it('should handle non-Error exceptions', async () => {
    await asyncTestPatterns.testErrorHandling(
      testHelpers.setupNetworkError,
      TEST_CONSTANTS.GENERIC_ERROR_MESSAGE,
      mockFetch,
      useAuthForm,
      TEST_CONSTANTS.STRING_ERROR_MESSAGE
    )
  })

  it('should set loading state during form submission', async () => {
    let resolvePromise: (value: unknown) => void
    const fetchPromise = new Promise(resolve => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(fetchPromise)

    const { result } = renderHook(() =>
      useAuthForm({ endpoint: TEST_CONSTANTS.LOGIN_ENDPOINT })
    )

    act(() => {
      result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBe('')
    expect(result.current.message).toBe('')

    await act(async () => {
      resolvePromise!({
        ok: true,
        json: vi.fn().mockResolvedValue({ user: { id: TEST_CONSTANTS.USER_ID } })
      })
    })

    expect(result.current.loading).toBe(false)
  })

  it('should allow manual error and message setting', () => {
    const { result } = renderHook(() =>
      useAuthForm({ endpoint: '/api/auth/test' })
    )

    act(() => {
      result.current.setError(TEST_CONSTANTS.MANUAL_ERROR_MESSAGE)
    })
    expect(result.current.error).toBe(TEST_CONSTANTS.MANUAL_ERROR_MESSAGE)

    act(() => {
      result.current.setMessage(TEST_CONSTANTS.MANUAL_SUCCESS_MESSAGE)
    })
    expect(result.current.message).toBe(TEST_CONSTANTS.MANUAL_SUCCESS_MESSAGE)
  })
})