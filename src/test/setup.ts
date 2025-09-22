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

afterEach(() => {
  cleanup()
  // Restore original console.error
  if (originalConsoleError) {
    console.error = originalConsoleError
  }
})