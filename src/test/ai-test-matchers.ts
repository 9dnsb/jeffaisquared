import { expect } from 'vitest'

// Custom matchers for AI response testing
interface CustomMatchers<R = unknown> {
  toHaveValidAIStructure(): R
  toHaveMetrics(expectedMetrics: string[]): R
  toBeInRange(min: number, max: number): R
  toHaveGroupBy(expectedGroupBy: string[]): R
  toHaveTopLocation(expectedLocation: string): R
  toHaveTopItem(expectedItem: string): R
  toHaveLocationCount(expectedCount: number): R
  toHaveItemCount(expectedCount: number): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

expect.extend({
  toHaveValidAIStructure(received) {
    const { isNot } = this

    const pass = received?.success === true &&
                 received?.data &&
                 Array.isArray(received.data)

    return {
      pass,
      message: () =>
        `${received ? 'Expected' : 'Did not expect'} AI response to have valid structure with success=true and data array${isNot ? ' (negated)' : ''}`
    }
  },

  toHaveMetrics(received, expectedMetrics: string[]) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data)) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array'
      }
    }

    const hasExpectedMetrics = expectedMetrics.every(metric =>
      received.data.some((row: any) => row[metric] !== undefined)
    )

    return {
      pass: hasExpectedMetrics,
      message: () =>
        `${hasExpectedMetrics ? 'Expected' : 'Did not expect'} AI response to have metrics: ${expectedMetrics.join(', ')}${isNot ? ' (negated)' : ''}`
    }
  },

  toBeInRange(received, min: number, max: number) {
    const { isNot } = this
    const pass = received >= min && received <= max

    return {
      pass,
      message: () =>
        `Expected ${received} to${isNot ? ' not' : ''} be between ${min} and ${max}`
    }
  },

  toHaveGroupBy(received, expectedGroupBy: string[]) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data)) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array'
      }
    }

    // For now, we'll check structural expectations based on groupBy
    let pass = true

    if (expectedGroupBy.length === 0) {
      // Should be simple aggregate (single row) or reasonable grouping
      pass = received.data.length === 1 || received.data.length <= 10
    } else if (expectedGroupBy.includes('location')) {
      // Should have multiple location rows
      pass = received.data.length > 1
    }

    return {
      pass,
      message: () =>
        `Expected AI response to match groupBy structure: ${expectedGroupBy.join(', ')}${isNot ? ' (negated)' : ''}`
    }
  },

  toHaveTopLocation(received, expectedLocation: string) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data) || received.data.length === 0) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array or empty'
      }
    }

    const topLocation = received.data[0]?.location || received.data[0]?.name
    const pass = topLocation && topLocation.includes(expectedLocation)

    return {
      pass,
      message: () =>
        `Expected top location to${isNot ? ' not' : ''} contain '${expectedLocation}', got '${topLocation}'`
    }
  },

  toHaveTopItem(received, expectedItem: string) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data) || received.data.length === 0) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array or empty'
      }
    }

    const topItem = received.data[0]?.item || received.data[0]?.name
    const pass = topItem === expectedItem

    return {
      pass,
      message: () =>
        `Expected top item to${isNot ? ' not' : ''} be '${expectedItem}', got '${topItem}'`
    }
  },

  toHaveLocationCount(received, expectedCount: number) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data)) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array'
      }
    }

    const pass = received.data.length === expectedCount

    return {
      pass,
      message: () =>
        `Expected ${expectedCount} locations, got ${received.data.length}${isNot ? ' (negated)' : ''}`
    }
  },

  toHaveItemCount(received, expectedCount: number) {
    const { isNot } = this

    if (!received?.data || !Array.isArray(received.data)) {
      return {
        pass: false,
        message: () => 'AI response missing valid data array'
      }
    }

    const pass = received.data.length === expectedCount

    return {
      pass,
      message: () =>
        `Expected ${expectedCount} items, got ${received.data.length}${isNot ? ' (negated)' : ''}`
    }
  }
})