import { expect, afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import './ai-test-matchers'

expect.extend(matchers)

// Store original console.error
let originalConsoleError: typeof console.error

// Fail tests on React act warnings
beforeEach(() => {
  originalConsoleError = console.error

  console.error = (...args: any[]) => {
    const message = args[0] as string
    if (typeof message === 'string' && message.includes('not wrapped in act')) {
      throw new Error(message) // fail the test
    }
    originalConsoleError(...args)
  }
})

afterEach(async () => {
  cleanup()
  // Restore original console.error
  if (originalConsoleError) {
    console.error = originalConsoleError
  }

  // Add delay between tests to prevent OpenAI rate limiting
  // OpenAI Tier 2: Higher limits, but still need some spacing for test stability
  await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
})