import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthFormFooter } from './AuthFormFooter'
import { TEST_CONSTANTS, mockSetup, createProps, componentPatterns } from '../../test/test-utils'

// Set up mocks
mockSetup.nextLink()

// Mock AuthButton component
vi.mock('./AuthButton', () => ({
  AuthButton: ({ loading, loadingText, children }: { loading: boolean; loadingText: string; children: React.ReactNode }) => (
    <button disabled={loading}>
      {loading ? loadingText : children}
    </button>
  )
}))

describe('AuthFormFooter', () => {
  const defaultProps = createProps.authFormFooter()

  it('should render AuthButton with correct props', () => {
    render(<AuthFormFooter {...defaultProps} />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent(TEST_CONSTANTS.BUTTON_TEXT)
    expect(button).not.toBeDisabled()
  })

  it('should render AuthButton in loading state', () => {
    render(<AuthFormFooter {...defaultProps} loading={true} />)

    const button = screen.getByRole('button')
    expect(button).toHaveTextContent(TEST_CONSTANTS.LOADING_TEXT)
    expect(button).toBeDisabled()
  })

  it('should render link with correct href and text', () => {
    render(<AuthFormFooter {...defaultProps} />)

    const link = screen.getByRole('link', { name: TEST_CONSTANTS.CREATE_ACCOUNT_LINK_TEXT })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', TEST_CONSTANTS.REGISTER_HREF)
  })

  it('should not show forgot password link when showForgotPassword is false', () => {
    render(<AuthFormFooter {...defaultProps} showForgotPassword={false} />)

    componentPatterns.expectForgotPasswordLinkNotVisible()
  })

  it('should not show forgot password link when showForgotPassword is not provided (default)', () => {
    render(<AuthFormFooter {...defaultProps} />)

    componentPatterns.expectForgotPasswordLinkNotVisible()
  })

  it('should show forgot password link when showForgotPassword is true', () => {
    render(<AuthFormFooter {...defaultProps} showForgotPassword={true} />)

    componentPatterns.expectForgotPasswordLinkVisible()
  })

  it('should apply correct CSS classes to forgot password link', () => {
    render(<AuthFormFooter {...defaultProps} showForgotPassword={true} />)

    componentPatterns.expectLinkWithClasses(TEST_CONSTANTS.FORGOT_PASSWORD_LINK_TEXT, TEST_CONSTANTS.FORGOT_PASSWORD_HREF, TEST_CONSTANTS.TEXT_SM_CLASS, TEST_CONSTANTS.TEXT_INDIGO_600_CLASS, TEST_CONSTANTS.HOVER_TEXT_INDIGO_500_CLASS)
  })

  it('should apply correct CSS classes to main link', () => {
    render(<AuthFormFooter {...defaultProps} />)

    componentPatterns.expectLinkWithClasses(TEST_CONSTANTS.CREATE_ACCOUNT_LINK_TEXT, TEST_CONSTANTS.REGISTER_HREF, TEST_CONSTANTS.FONT_MEDIUM_CLASS, TEST_CONSTANTS.TEXT_INDIGO_600_CLASS, TEST_CONSTANTS.HOVER_TEXT_INDIGO_500_CLASS)
  })

  it('should render with custom link text and href', () => {
    render(
      <AuthFormFooter
        {...defaultProps}
        linkHref={TEST_CONSTANTS.LOGIN_HREF}
        linkText={TEST_CONSTANTS.ALREADY_HAVE_ACCOUNT_TEXT}
      />
    )

    const link = screen.getByRole('link', { name: TEST_CONSTANTS.ALREADY_HAVE_ACCOUNT_TEXT })
    expect(link).toHaveAttribute('href', TEST_CONSTANTS.LOGIN_HREF)
  })

  it('should render with custom button text', () => {
    render(<AuthFormFooter {...defaultProps} buttonText={TEST_CONSTANTS.CREATE_ACCOUNT_BUTTON_TEXT} />)

    expect(screen.getByRole('button')).toHaveTextContent(TEST_CONSTANTS.CREATE_ACCOUNT_BUTTON_TEXT)
  })

  it('should render with custom loading text', () => {
    render(
      <AuthFormFooter
        {...defaultProps}
        loading={true}
        loadingText={TEST_CONSTANTS.CREATING_ACCOUNT_TEXT}
      />
    )

    expect(screen.getByRole('button')).toHaveTextContent(TEST_CONSTANTS.CREATING_ACCOUNT_TEXT)
  })

  it('should have proper structure with forgot password shown', () => {
    const { container } = render(<AuthFormFooter {...defaultProps} showForgotPassword={true} />)

    // Should have forgot password container
    expect(container.querySelector(TEST_CONSTANTS.FLEX_ITEMS_CENTER_JUSTIFY_BETWEEN_CLASS)).toBeInTheDocument()

    // Should have button container
    expect(container.querySelector(TEST_CONSTANTS.DIV_SELECTOR)).toBeInTheDocument()

    // Should have link container
    expect(container.querySelector('.text-center')).toBeInTheDocument()
  })

  it('should have proper structure without forgot password', () => {
    const { container } = render(<AuthFormFooter {...defaultProps} />)

    // Should not have forgot password container
    expect(container.querySelector('.flex.items-center.justify-between')).not.toBeInTheDocument()

    // Should still have button and link containers
    const divElements = container.querySelectorAll('div')
    expect(divElements.length).toBeGreaterThan(0)
  })
})