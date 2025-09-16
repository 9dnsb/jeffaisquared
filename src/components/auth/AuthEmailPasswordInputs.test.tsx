import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthEmailPasswordInputs } from './AuthEmailPasswordInputs'
import { TEST_CONSTANTS, createProps, componentPatterns } from '../../test/test-utils'

describe('AuthEmailPasswordInputs', () => {
  const defaultProps = createProps.authEmailPasswordInputs()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render email and password inputs', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    componentPatterns.expectEmailPasswordInputsRendered()
  })

  it('should display current email and password values', () => {
    render(
      <AuthEmailPasswordInputs
        {...defaultProps}
        email={TEST_CONSTANTS.EMAIL}
        password={TEST_CONSTANTS.PASSWORD}
      />
    )

    componentPatterns.expectInputValues(TEST_CONSTANTS.EMAIL, TEST_CONSTANTS.PASSWORD)
  })

  it('should call setEmail when email input changes', () => {
    const setEmail = vi.fn()
    render(<AuthEmailPasswordInputs {...defaultProps} setEmail={setEmail} />)

    componentPatterns.expectInputChangeHandler(TEST_CONSTANTS.EMAIL_PLACEHOLDER, setEmail, TEST_CONSTANTS.EMAIL)
  })

  it('should call setPassword when password input changes', () => {
    const setPassword = vi.fn()
    render(<AuthEmailPasswordInputs {...defaultProps} setPassword={setPassword} />)

    componentPatterns.expectInputChangeHandler(TEST_CONSTANTS.PASSWORD_PLACEHOLDER, setPassword, TEST_CONSTANTS.PASSWORD)
  })

  it('should render with custom password placeholder', () => {
    render(
      <AuthEmailPasswordInputs
        {...defaultProps}
        passwordPlaceholder="Enter your password"
      />
    )

    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Password')).not.toBeInTheDocument()
  })

  it('should use default password placeholder when not provided', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('should render with current-password autoComplete by default', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    const passwordInput = screen.getByPlaceholderText(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
  })

  it('should render with new-password autoComplete when specified', () => {
    render(
      <AuthEmailPasswordInputs {...defaultProps} autoComplete="new-password" />
    )

    const passwordInput = screen.getByPlaceholderText(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)
    expect(passwordInput).toHaveAttribute('autoComplete', 'new-password')
  })

  it('should render inputs separately when stacked is false', () => {
    const { container } = render(
      <AuthEmailPasswordInputs {...defaultProps} stacked={false} />
    )

    componentPatterns.expectStackedInputsNotRendered(container)
  })

  it('should render inputs separately when stacked is not provided (default)', () => {
    const { container } = render(<AuthEmailPasswordInputs {...defaultProps} />)

    componentPatterns.expectStackedInputsNotRendered(container)
  })

  it('should render inputs in stacked container when stacked is true', () => {
    const { container } = render(
      <AuthEmailPasswordInputs {...defaultProps} stacked={true} />
    )

    componentPatterns.expectStackedInputsRendered(container)
  })

  it('should apply stacked styles when stacked is true', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} stacked={true} />)

    const emailInput = screen.getByPlaceholderText(TEST_CONSTANTS.EMAIL_PLACEHOLDER)
    const passwordInput = screen.getByPlaceholderText(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)

    expect(emailInput).toHaveClass(TEST_CONSTANTS.ROUNDED_T_MD_CLASS, TEST_CONSTANTS.ROUNDED_NONE_CLASS)
    expect(passwordInput).toHaveClass(TEST_CONSTANTS.ROUNDED_B_MD_CLASS, TEST_CONSTANTS.ROUNDED_NONE_CLASS)
  })

  it('should apply minLength to password input when provided', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} minLength={8} />)

    const passwordInput = screen.getByPlaceholderText(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)
    expect(passwordInput).toHaveAttribute('minLength', '8')
  })

  it('should not apply minLength when not provided', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    const passwordInput = screen.getByPlaceholderText(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)
    expect(passwordInput).not.toHaveAttribute('minLength')
  })

  it('should have required attributes on both inputs', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    componentPatterns.expectRequiredInput(TEST_CONSTANTS.EMAIL_PLACEHOLDER)
    componentPatterns.expectRequiredInput(TEST_CONSTANTS.PASSWORD_PLACEHOLDER)
  })

  it('should have correct input types', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    componentPatterns.expectInputWithAttribute(TEST_CONSTANTS.EMAIL_PLACEHOLDER, 'type', 'email')
    componentPatterns.expectInputWithAttribute(TEST_CONSTANTS.PASSWORD_PLACEHOLDER, 'type', 'password')
  })

  it('should have email autoComplete on email input', () => {
    render(<AuthEmailPasswordInputs {...defaultProps} />)

    const emailInput = screen.getByPlaceholderText(TEST_CONSTANTS.EMAIL_PLACEHOLDER)
    expect(emailInput).toHaveAttribute('autoComplete', 'email')
  })
})