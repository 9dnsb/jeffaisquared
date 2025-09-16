import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AuthInput } from './AuthInput'
import { createProps, componentPatterns, TEST_CONSTANTS } from '../../test/test-utils'

describe('AuthInput', () => {
  const defaultProps = createProps.authInput()

  it('should render with required props', () => {
    render(<AuthInput {...defaultProps} />)

    const input = screen.getByPlaceholderText(TEST_CONSTANTS.PLACEHOLDER_TEXT)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('id', 'test-input')
    expect(input).toHaveAttribute('name', 'testName')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('should display the correct value', () => {
    render(<AuthInput {...defaultProps} value="test value" />)

    const input = screen.getByDisplayValue('test value')
    expect(input).toBeInTheDocument()
  })

  it('should call onChange when input changes', () => {
    const onChange = vi.fn()
    render(<AuthInput {...defaultProps} onChange={onChange} />)

    const input = screen.getByPlaceholderText(TEST_CONSTANTS.PLACEHOLDER_TEXT)
    fireEvent.change(input, { target: { value: 'new value' } })

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(expect.any(Object))
  })

  it('should render with autoComplete attribute', () => {
    render(<AuthInput {...defaultProps} autoComplete="email" />)

    componentPatterns.expectInputWithAttribute(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'autoComplete', 'email')
  })

  it('should render without autoComplete when not provided', () => {
    render(<AuthInput {...defaultProps} />)

    componentPatterns.expectInputWithoutAttribute(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'autoComplete')
  })

  it('should be required when required prop is true', () => {
    render(<AuthInput {...defaultProps} required={true} />)

    componentPatterns.expectRequiredInput(TEST_CONSTANTS.PLACEHOLDER_TEXT)
  })

  it('should not be required when required prop is false', () => {
    render(<AuthInput {...defaultProps} required={false} />)

    componentPatterns.expectNotRequiredInput(TEST_CONSTANTS.PLACEHOLDER_TEXT)
  })

  it('should default required to false when not provided', () => {
    render(<AuthInput {...defaultProps} />)

    componentPatterns.expectNotRequiredInput(TEST_CONSTANTS.PLACEHOLDER_TEXT)
  })

  it('should render with minLength attribute', () => {
    render(<AuthInput {...defaultProps} minLength={8} />)

    componentPatterns.expectInputWithAttribute(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'minLength', '8')
  })

  it('should render without minLength when not provided', () => {
    render(<AuthInput {...defaultProps} />)

    componentPatterns.expectInputWithoutAttribute(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'minLength')
  })

  it('should render with default className when not provided', () => {
    render(<AuthInput {...defaultProps} />)

    componentPatterns.expectInputWithDefaultClasses(TEST_CONSTANTS.PLACEHOLDER_TEXT)
  })

  it('should render with custom className when provided', () => {
    render(<AuthInput {...defaultProps} className="custom-class" />)

    componentPatterns.expectInputWithCustomClass(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'custom-class')
  })

  it('should handle different input types', () => {
    render(<AuthInput {...defaultProps} type="password" />)

    componentPatterns.expectInputWithAttribute(TEST_CONSTANTS.PLACEHOLDER_TEXT, 'type', 'password')
  })
})