import { vi, expect } from 'vitest'
import {
  renderHook,
  screen,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import React, { act } from 'react'

// Common test constants
export const TEST_CONSTANTS = {
  EMAIL: 'test@example.com',
  PASSWORD: 'password123',
  USER_ID: '123',
  SUCCESS_MESSAGE: 'Success',
  ERROR_MESSAGE: 'Invalid credentials',
  DASHBOARD_PATH: '/dashboard',
  LOGIN_ENDPOINT: '/api/auth/login',
  REGISTER_ENDPOINT: '/api/auth/register',
  BUTTON_TEXT: 'Submit',
  LOADING_TEXT: 'Loading...',
  // Common test strings
  PLACEHOLDER_TEXT: 'Enter text',
  EMAIL_PLACEHOLDER: 'Email address',
  PASSWORD_PLACEHOLDER: 'Password',
  CONTENT_TEXT: 'Content',
  SIGN_IN_TITLE: 'Sign In',
  FORM_CONTENT: 'Form content',
  TEST_ENDPOINT: '/api/auth/test',
  // HTTP Status Codes
  HTTP_200: 200,
  HTTP_201: 201,
  HTTP_400: 400,
  HTTP_401: 401,
  HTTP_500: 500,
  // Common numbers
  MIN_PASSWORD_LENGTH: 6,
  MIN_PASSWORD_LENGTH_8: 8,
  // Link text and hrefs
  CREATE_ACCOUNT_LINK_TEXT: 'Create new account',
  REGISTER_HREF: '/auth/register',
  LOGIN_HREF: '/auth/login',
  FORGOT_PASSWORD_LINK_TEXT: 'Forgot your password?',
  FORGOT_PASSWORD_HREF: '/auth/forgot-password',
  ALREADY_HAVE_ACCOUNT_TEXT: 'Already have an account? Sign in',
  CREATE_ACCOUNT_BUTTON_TEXT: 'Create Account',
  CREATING_ACCOUNT_TEXT: 'Creating account...',
  // Test messages
  ERROR_MESSAGE_TEST: 'Something went wrong',
  SUCCESS_MESSAGE_TEST: 'Operation successful',
  ERROR_MESSAGE_GENERIC: 'Error message',
  SUCCESS_MESSAGE_GENERIC: 'Success message',
  PASSWORD_RESET_MESSAGE: 'Password reset email sent',
  REQUEST_FAILED_MESSAGE: 'Request failed',
  NETWORK_ERROR_MESSAGE: 'Network error',
  GENERIC_ERROR_MESSAGE: 'An error occurred',
  STRING_ERROR_MESSAGE: 'String error',
  MANUAL_ERROR_MESSAGE: 'Manual error',
  MANUAL_SUCCESS_MESSAGE: 'Manual message',
  FORGOT_PASSWORD_ENDPOINT: '/api/auth/forgot-password',
  // API error messages
  TEST_ERROR_MESSAGE: 'Test error',
  INVALID_INPUT_MESSAGE: 'Invalid input',
  INTERNAL_SERVER_ERROR_MESSAGE: 'Internal server error',
  INVALID_CREDENTIALS_MESSAGE: 'Invalid credentials',
  REGISTRATION_FAILED_MESSAGE: 'Registration failed',
  NO_ACTIVE_SESSION_MESSAGE: 'No active session',
  // Supabase test constants
  TEST_SUPABASE_URL: 'https://test.supabase.co',
  TEST_ANON_KEY: 'test-anon-key',
  MISSING_SUPABASE_ENV_ERROR: 'Missing Supabase environment variables',
  // Cookie test constants
  TEST_COOKIE_NAME: 'test',
  TEST_COOKIE_VALUE: 'cookie',
  AUTH_TOKEN_COOKIE: 'auth-token',
  TOKEN_VALUE: 'token123',
  COOKIE_ERROR_MESSAGE: 'Cannot set cookie in Server Component',
  // CSS class constants
  ROUNDED_NONE_CLASS: 'rounded-none',
  ROUNDED_T_MD_CLASS: 'rounded-t-md',
  ROUNDED_B_MD_CLASS: 'rounded-b-md',
  TEXT_SM_CLASS: 'text-sm',
  TEXT_INDIGO_600_CLASS: 'text-indigo-600',
  HOVER_TEXT_INDIGO_500_CLASS: 'hover:text-indigo-500',
  FONT_MEDIUM_CLASS: 'font-medium',
  FLEX_ITEMS_CENTER_JUSTIFY_BETWEEN_CLASS: '.flex.items-center.justify-between',
  DIV_SELECTOR: 'div',
  // Loading spinner classes
  ANIMATE_SPIN_SELECTOR: '.animate-spin',
  ANIMATE_SPIN_CLASS: 'animate-spin',
  ROUNDED_FULL_CLASS: 'rounded-full',
  BORDER_B_2_CLASS: 'border-b-2',
  BORDER_INDIGO_600_CLASS: 'border-indigo-600',
  H_32_CLASS: 'h-32',
  W_32_CLASS: 'w-32',
  STACKED_INPUT_SELECTOR: '.rounded-md.shadow-sm.-space-y-px',
} as const

// Common mock setup
export const mockSetup = {
  nextLink: () => {
    vi.mock('next/link', () => ({
      default: ({
        href,
        className,
        children,
      }: {
        href: string
        className?: string
        children: React.ReactNode
      }) => React.createElement('a', { href, className }, children),
    }))
  },
}

// Common response creators
export const createResponse = {
  success: (data: any = {}) => ({
    ok: true,
    json: vi.fn().mockResolvedValue({
      user: { id: TEST_CONSTANTS.USER_ID },
      message: TEST_CONSTANTS.SUCCESS_MESSAGE,
      ...data,
    }),
  }),

  error: (error: any = {}) => ({
    ok: false,
    json: vi.fn().mockResolvedValue({
      error: TEST_CONSTANTS.ERROR_MESSAGE,
      ...error,
    }),
  }),
}

// Common test helpers
export const testHelpers = {
  setupSuccessResponse: (mockFetch: any, data: any = {}) => {
    mockFetch.mockResolvedValueOnce(createResponse.success(data))
  },

  setupErrorResponse: (mockFetch: any, error: any = {}) => {
    mockFetch.mockResolvedValueOnce(createResponse.error(error))
  },

  setupNetworkError: (
    mockFetch: any,
    error: any = new Error('Network error')
  ) => {
    mockFetch.mockRejectedValueOnce(error)
  },

  expectLoadingState: (result: any) => {
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('')
    expect(result.current.message).toBe('')
  },

  expectErrorState: (result: any, errorMessage: string) => {
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.message).toBe('')
    expect(result.current.loading).toBe(false)
  },

  expectSuccessState: (result: any, message: string) => {
    expect(result.current.message).toBe(message)
    expect(result.current.error).toBe('')
    expect(result.current.loading).toBe(false)
  },
}

// Common prop builders
export const createProps = {
  authButton: (overrides = {}) => ({
    loading: false,
    loadingText: TEST_CONSTANTS.LOADING_TEXT,
    children: TEST_CONSTANTS.BUTTON_TEXT,
    ...overrides,
  }),

  authInput: (overrides = {}) => ({
    id: 'test-input',
    name: 'testName',
    type: 'text',
    placeholder: 'Enter text',
    value: '',
    onChange: vi.fn(),
    ...overrides,
  }),

  authFormFooter: (overrides = {}) => ({
    loading: false,
    loadingText: TEST_CONSTANTS.LOADING_TEXT,
    buttonText: TEST_CONSTANTS.BUTTON_TEXT,
    linkHref: TEST_CONSTANTS.REGISTER_HREF,
    linkText: TEST_CONSTANTS.CREATE_ACCOUNT_LINK_TEXT,
    ...overrides,
  }),

  authEmailPasswordInputs: (overrides = {}) => ({
    email: '',
    setEmail: vi.fn(),
    password: '',
    setPassword: vi.fn(),
    ...overrides,
  }),
}

// Shared test patterns for hooks
export const hookPatterns = {
  expectAuthRedirectCheckingToFalse: async (result: any) => {
    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  },

  expectSessionApiCall: (mockFetch: any) => {
    expect(mockFetch).toHaveBeenCalledWith('/api/auth/session')
  },

  expectAuthFormSubmissionCall: (
    mockFetch: any,
    endpoint: string,
    data: any
  ) => {
    expect(mockFetch).toHaveBeenCalledWith(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
  },

  testAuthRedirectScenario: async (
    mockFetch: any,
    mockPush: any,
    useAuthRedirect: any,
    responseSetup: any,
    shouldRedirect: boolean
  ) => {
    mockFetch.mockResolvedValueOnce(responseSetup)

    const { result } = renderHook(() => useAuthRedirect())

    await hookPatterns.expectAuthRedirectCheckingToFalse(result)

    hookPatterns.expectSessionApiCall(mockFetch)

    if (shouldRedirect) {
      expect(mockPush).toHaveBeenCalledWith(TEST_CONSTANTS.DASHBOARD_PATH)
    } else {
      expect(mockPush).not.toHaveBeenCalled()
    }
  },
}

// Shared test patterns for components
export const componentPatterns = {
  expectButtonRendered: (text: string) => {
    expect(screen.getByText(text)).toBeInTheDocument()
    expect(screen.getByRole('button')).not.toBeDisabled()
  },

  expectLoadingButton: (loadingText: string, originalText: string) => {
    expect(screen.getByText(loadingText)).toBeInTheDocument()
    expect(screen.queryByText(originalText)).not.toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  },

  expectDisabledButton: (text: string) => {
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(text)).toBeInTheDocument()
  },

  expectInputRendered: (placeholder: string, inputType = 'textbox') => {
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument()
    expect(screen.getByRole(inputType)).toBeInTheDocument()
  },

  expectPasswordInputRendered: (placeholder: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'password')
  },

  expectErrorState: (errorText: string) => {
    expect(screen.getByText(errorText)).toBeInTheDocument()
    expect(screen.getByText(errorText)).toHaveClass('text-red-600')
  },

  expectLinkRendered: (text: string, href: string) => {
    const link = screen.getByText(text)
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', href)
  },

  expectInputWithAttribute: (
    placeholder: string,
    attribute: string,
    value: string
  ) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute(attribute, value)
  },

  expectInputWithoutAttribute: (placeholder: string, attribute: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toBeInTheDocument()
    expect(input).not.toHaveAttribute(attribute)
  },

  expectRequiredInput: (placeholder: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toBeRequired()
  },

  expectNotRequiredInput: (placeholder: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).not.toBeRequired()
  },

  expectInputWithDefaultClasses: (placeholder: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toHaveClass(
      'appearance-none',
      'relative',
      'block',
      'w-full',
      'px-3',
      'py-2',
      'border',
      'border-gray-300',
      'placeholder-gray-500',
      'text-gray-900',
      'rounded-md',
      'focus:outline-none',
      'focus:ring-indigo-500',
      'focus:border-indigo-500',
      'sm:text-sm'
    )
  },

  expectInputWithCustomClass: (placeholder: string, className: string) => {
    const input = screen.getByPlaceholderText(placeholder)
    expect(input).toHaveClass(className)
    expect(input).not.toHaveClass('appearance-none')
  },

  expectLinkWithClasses: (text: string, href: string, ...classes: string[]) => {
    const link = screen.getByRole('link', { name: text })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', href)
    expect(link).toHaveClass(...classes)
  },

  expectForgotPasswordLinkNotVisible: () => {
    expect(
      screen.queryByText(TEST_CONSTANTS.FORGOT_PASSWORD_LINK_TEXT)
    ).not.toBeInTheDocument()
  },

  expectForgotPasswordLinkVisible: () => {
    const forgotPasswordLink = screen.getByRole('link', {
      name: TEST_CONSTANTS.FORGOT_PASSWORD_LINK_TEXT,
    })
    expect(forgotPasswordLink).toBeInTheDocument()
    expect(forgotPasswordLink).toHaveAttribute('href', '/auth/forgot-password')
  },

  expectEmailPasswordInputsRendered: () => {
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  },

  expectInputValues: (email: string, password: string) => {
    expect(screen.getByDisplayValue(email)).toBeInTheDocument()
    expect(screen.getByDisplayValue(password)).toBeInTheDocument()
  },

  expectInputChangeHandler: (
    placeholder: string,
    mockFunction: any,
    testValue: string
  ) => {
    const input = screen.getByPlaceholderText(placeholder)
    fireEvent.change(input, { target: { value: testValue } })
    expect(mockFunction).toHaveBeenCalledTimes(1)
    expect(mockFunction).toHaveBeenCalledWith(testValue)
  },

  expectStackedInputsNotRendered: (container: HTMLElement) => {
    expect(
      container.querySelector(TEST_CONSTANTS.STACKED_INPUT_SELECTOR)
    ).not.toBeInTheDocument()
    expect(container.querySelectorAll('div')).toHaveLength(2)
  },

  expectStackedInputsRendered: (container: HTMLElement) => {
    expect(
      container.querySelector(TEST_CONSTANTS.STACKED_INPUT_SELECTOR)
    ).toBeInTheDocument()
    const stackedContainer = container.querySelector(
      TEST_CONSTANTS.STACKED_INPUT_SELECTOR
    )
    expect(stackedContainer?.querySelectorAll('div')).toHaveLength(2)
  },

  expectAuthLayoutWithTitle: (title: string, content: string) => {
    render(
      React.createElement(
        'AuthLayout',
        { title },
        React.createElement('div', {}, content)
      )
    )
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(title)
  },

  expectSpinnerWithClasses: (container: HTMLElement, ...classes: string[]) => {
    const spinner = container.querySelector(
      TEST_CONSTANTS.ANIMATE_SPIN_SELECTOR
    )
    expect(spinner).toHaveClass(...classes)
    return spinner
  },
}

// Shared test patterns for async form tests
export const asyncTestPatterns = {
  testErrorHandling: async (
    setupMethod: (mockFetch: any, ...args: any[]) => void,
    expectedError: string,
    mockFetch: any,
    useAuthForm: any,
    ...setupArgs: any[]
  ) => {
    setupMethod(mockFetch, ...setupArgs)

    const { result } = renderHook(() =>
      useAuthForm({ endpoint: TEST_CONSTANTS.LOGIN_ENDPOINT })
    )

    await act(async () => {
      await result.current.submitForm({ email: TEST_CONSTANTS.EMAIL })
    })

    testHelpers.expectErrorState(result, expectedError)
  },
}

// Auth API route test utilities
export const authApiPatterns = {
  // Mock NextRequest factory
  createMockRequest: (body: any): any => ({
    json: vi.fn().mockResolvedValue(body),
  }),

  // Common test pattern for request parsing failures
  testRequestParsingFailure: async (
    handler: (request: any) => Promise<any>,
    mockRequest: any,
    authApiUtils: any,
    supabaseClient?: any
  ) => {
    const mockParseError = { error: 'Invalid email format' }

    authApiUtils.parseRequestBody.mockResolvedValue({
      data: null,
      error: mockParseError,
    })

    const response = await handler(mockRequest)

    expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(
      mockRequest,
      expect.any(Object)
    )

    // Ensure Supabase method wasn't called when request parsing fails
    if (supabaseClient) {
      if (supabaseClient.auth.signInWithPassword) {
        expect(supabaseClient.auth.signInWithPassword).not.toHaveBeenCalled()
      }
      if (supabaseClient.auth.signUp) {
        expect(supabaseClient.auth.signUp).not.toHaveBeenCalled()
      }
      if (supabaseClient.auth.resetPasswordForEmail) {
        expect(supabaseClient.auth.resetPasswordForEmail).not.toHaveBeenCalled()
      }
    }

    expect(response).toBe(mockParseError)
  },

  // Common test pattern for validation failures (specific error types)
  testValidationFailure: async (
    handler: (request: any) => Promise<any>,
    invalidData: any,
    authApiUtils: any,
    expectedErrorMessage: string = 'Invalid email format'
  ) => {
    const mockRequest = authApiPatterns.createMockRequest(invalidData)
    const mockParseError = { error: expectedErrorMessage }

    authApiUtils.parseRequestBody.mockResolvedValue({
      data: null,
      error: mockParseError,
    })

    const response = await handler(mockRequest)

    expect(authApiUtils.parseRequestBody).toHaveBeenCalledWith(
      mockRequest,
      expect.any(Object)
    )
    expect(response).toBe(mockParseError)
  },
}

// Shared describe blocks and test structures
export const testStructures = {
  // Future test structures can be added here when needed
}
