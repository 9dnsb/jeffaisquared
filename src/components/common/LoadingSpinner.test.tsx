import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { LoadingSpinner } from './LoadingSpinner'
import { TEST_CONSTANTS, componentPatterns } from '../../test/test-utils'

describe('LoadingSpinner', () => {
  it('should render with default className', () => {
    const { container } = render(<LoadingSpinner />)


    componentPatterns.expectSpinnerWithClasses(container, TEST_CONSTANTS.ANIMATE_SPIN_CLASS, TEST_CONSTANTS.ROUNDED_FULL_CLASS, TEST_CONSTANTS.BORDER_B_2_CLASS, TEST_CONSTANTS.BORDER_INDIGO_600_CLASS, TEST_CONSTANTS.H_32_CLASS, TEST_CONSTANTS.W_32_CLASS)
  })

  it('should render with custom className', () => {
    const { container } = render(<LoadingSpinner className="h-16 w-16" />)

    componentPatterns.expectSpinnerWithClasses(container, TEST_CONSTANTS.ANIMATE_SPIN_CLASS, TEST_CONSTANTS.ROUNDED_FULL_CLASS, TEST_CONSTANTS.BORDER_B_2_CLASS, TEST_CONSTANTS.BORDER_INDIGO_600_CLASS, 'h-16', 'w-16')
  })

  it('should render with proper structure', () => {
    const { container } = render(<LoadingSpinner />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center')

    const spinner = container.querySelector(TEST_CONSTANTS.ANIMATE_SPIN_SELECTOR)
    expect(spinner).toBeTruthy()
  })
})