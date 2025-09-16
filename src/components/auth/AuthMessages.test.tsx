import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthMessages } from './AuthMessages'
import { TEST_CONSTANTS } from '../../test/test-utils'

describe('AuthMessages', () => {
  it('should render nothing when no error or message provided', () => {
    const { container } = render(<AuthMessages />)

    expect(container.firstChild).toBeNull()
  })

  it('should render error message when error is provided', () => {
    render(<AuthMessages error={TEST_CONSTANTS.ERROR_MESSAGE_TEST} />)

    const errorElement = screen.getByText(TEST_CONSTANTS.ERROR_MESSAGE_TEST)
    expect(errorElement).toBeInTheDocument()
  })

  it('should render success message when message is provided', () => {
    render(<AuthMessages message={TEST_CONSTANTS.SUCCESS_MESSAGE_TEST} />)

    const messageElement = screen.getByText(TEST_CONSTANTS.SUCCESS_MESSAGE_TEST)
    expect(messageElement).toBeInTheDocument()
  })

  it('should render both error and message when both are provided', () => {
    render(
      <AuthMessages error={TEST_CONSTANTS.ERROR_MESSAGE_TEST} message="But this succeeded" />
    )

    expect(screen.getByText(TEST_CONSTANTS.ERROR_MESSAGE_TEST)).toBeInTheDocument()
    expect(screen.getByText('But this succeeded')).toBeInTheDocument()
  })

  it('should apply correct CSS classes to error message', () => {
    render(<AuthMessages error={TEST_CONSTANTS.ERROR_MESSAGE_GENERIC} />)

    const errorElement = screen.getByText(TEST_CONSTANTS.ERROR_MESSAGE_GENERIC)
    expect(errorElement).toHaveClass(
      'bg-red-50',
      'border',
      'border-red-200',
      'text-red-600',
      'px-4',
      'py-3',
      'rounded'
    )
  })

  it('should apply correct CSS classes to success message', () => {
    render(<AuthMessages message={TEST_CONSTANTS.SUCCESS_MESSAGE_GENERIC} />)

    const messageElement = screen.getByText(TEST_CONSTANTS.SUCCESS_MESSAGE_GENERIC)
    expect(messageElement).toHaveClass(
      'bg-green-50',
      'border',
      'border-green-200',
      'text-green-600',
      'px-4',
      'py-3',
      'rounded'
    )
  })

  it('should not render error when error is empty string', () => {
    render(<AuthMessages error="" />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    // Check that no div with error classes exists
    const { container } = render(<AuthMessages error="" />)
    expect(container.querySelector('.bg-red-50')).not.toBeInTheDocument()
  })

  it('should not render message when message is empty string', () => {
    render(<AuthMessages message="" />)

    // Check that no div with success classes exists
    const { container } = render(<AuthMessages message="" />)
    expect(container.querySelector('.bg-green-50')).not.toBeInTheDocument()
  })

  it('should handle multiline error messages', () => {
    const multilineError = 'Line 1\nLine 2\nLine 3'
    const { container } = render(<AuthMessages error={multilineError} />)

    const errorDiv = container.querySelector('.bg-red-50')
    expect(errorDiv?.textContent).toBe(multilineError)
  })

  it('should handle multiline success messages', () => {
    const multilineMessage = 'Success line 1\nSuccess line 2'
    const { container } = render(<AuthMessages message={multilineMessage} />)

    const messageDiv = container.querySelector('.bg-green-50')
    expect(messageDiv?.textContent).toBe(multilineMessage)
  })

  it('should handle HTML entities in messages', () => {
    render(<AuthMessages error="Error with &lt;tags&gt;" />)

    expect(screen.getByText('Error with <tags>')).toBeInTheDocument()
  })

  it('should handle long error messages', () => {
    const longError = 'This is a very long error message that should still be displayed correctly with proper styling and formatting even when it spans multiple lines and contains lots of text.'
    render(<AuthMessages error={longError} />)

    expect(screen.getByText(longError)).toBeInTheDocument()
  })

  it('should handle long success messages', () => {
    const longMessage = 'This is a very long success message that should still be displayed correctly with proper styling and formatting even when it spans multiple lines and contains lots of text.'
    render(<AuthMessages message={longMessage} />)

    expect(screen.getByText(longMessage)).toBeInTheDocument()
  })
})