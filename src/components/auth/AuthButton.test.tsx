import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthButton } from './AuthButton'
import { TEST_CONSTANTS, createProps, componentPatterns } from '../../test/test-utils'

describe('AuthButton', () => {
  it('should render children when not loading', () => {
    render(
      <AuthButton {...createProps.authButton()}>
        {TEST_CONSTANTS.BUTTON_TEXT}
      </AuthButton>
    )

    componentPatterns.expectButtonRendered(TEST_CONSTANTS.BUTTON_TEXT)
  })

  it('should render loading text when loading', () => {
    const loadingText = 'Submitting...'
    render(
      <AuthButton {...createProps.authButton({ loading: true, loadingText })}>
        {TEST_CONSTANTS.BUTTON_TEXT}
      </AuthButton>
    )

    componentPatterns.expectLoadingButton(loadingText, TEST_CONSTANTS.BUTTON_TEXT)
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <AuthButton {...createProps.authButton({ disabled: true })}>
        {TEST_CONSTANTS.BUTTON_TEXT}
      </AuthButton>
    )

    componentPatterns.expectDisabledButton(TEST_CONSTANTS.BUTTON_TEXT)
  })

  it('should be disabled when both loading and disabled are true', () => {
    render(
      <AuthButton {...createProps.authButton({ loading: true, disabled: true })}>
        {TEST_CONSTANTS.BUTTON_TEXT}
      </AuthButton>
    )

    componentPatterns.expectDisabledButton(TEST_CONSTANTS.LOADING_TEXT)
  })

  it('should have correct attributes', () => {
    render(
      <AuthButton {...createProps.authButton()}>
        {TEST_CONSTANTS.BUTTON_TEXT}
      </AuthButton>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveClass(
      'group',
      'relative',
      'w-full',
      'flex',
      'justify-center',
      'py-2',
      'px-4',
      'border',
      'border-transparent',
      'text-sm',
      'font-medium',
      'rounded-md',
      'text-white',
      'bg-indigo-600',
      'hover:bg-indigo-700',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-offset-2',
      'focus:ring-indigo-500',
      'disabled:opacity-50'
    )
  })

  it('should render complex children', () => {
    render(
      <AuthButton loading={false} loadingText="Loading...">
        <span>Sign In</span>
      </AuthButton>
    )

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('should handle disabled prop defaulting to false', () => {
    render(
      <AuthButton loading={false} loadingText="Loading...">
        Submit
      </AuthButton>
    )

    expect(screen.getByRole('button')).not.toBeDisabled()
  })
})